const { useState, useEffect, useMemo } = React;

const GOOGLE_CLIENT_ID =
    "1031418799659-049fh5b6cgvds9v4f6h5eek8gh4kctdq.apps.googleusercontent.com";

function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [user, setUser] = useState(null);

    const [currentPage, setCurrentPage] = useState("register");

    const [students, setStudents] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);

    const [search, setSearch] = useState("");
    const [sortOrder, setSortOrder] = useState("default");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [bloodGroupFilter, setBloodGroupFilter] = useState("all");

    const [student, setStudent] = useState({
        name: "",
        studentNumber: "",
        email: "",
        phone: "",
        department: "",
        year: "",
        bloodGroup: ""
    });

    // ---------------------------------------------
    // CHECK EXISTING LOGIN SESSION
    // ---------------------------------------------

    useEffect(() => {
        fetch("/auth/me")
            .then((response) => response.json())
            .then((data) => {
                if (data.loggedIn) {
                    setUser(data.user);
                    setLoggedIn(true);
                }
            })
            .catch(() => {
                console.log("No existing login session.");
            });
    }, []);

    // ---------------------------------------------
    // GOOGLE LOGIN BUTTON
    // ---------------------------------------------

    useEffect(() => {
        if (loggedIn) return;

        let attempts = 0;

        const setupGoogle = setInterval(() => {
            attempts++;

            if (
                window.google &&
                window.google.accounts &&
                window.google.accounts.id
            ) {
                clearInterval(setupGoogle);

                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleLogin
                });

                const button = document.getElementById(
                    "google-login-button"
                );

                if (button) {
                    button.innerHTML = "";

                    window.google.accounts.id.renderButton(
                        button,
                        {
                            theme: "outline",
                            size: "large",
                            width: 320,
                            text: "signin_with",
                            shape: "rectangular"
                        }
                    );
                }
            }

            if (attempts > 50) {
                clearInterval(setupGoogle);
            }
        }, 200);

        return () => clearInterval(setupGoogle);
    }, [loggedIn]);

    // ---------------------------------------------
    // SECURE GOOGLE LOGIN
    // ---------------------------------------------

    async function handleGoogleLogin(response) {

        try {

            const result = await fetch("/auth/google", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    credential: response.credential
                })
            });

            const data = await result.json();

            if (!result.ok || !data.success) {
                alert(
                    data.message ||
                    "Google authentication failed."
                );
                return;
            }

            setUser(data.user);
            setLoggedIn(true);

        } catch (error) {

            console.error("Google login error:", error);

            alert(
                "Could not connect to the Flask server."
            );
        }
    }

    // ---------------------------------------------
    // LOGOUT
    // ---------------------------------------------

    async function handleLogout() {

        try {

            await fetch("/auth/logout", {
                method: "POST"
            });

        } catch (error) {
            console.error("Logout error:", error);
        }

        setUser(null);
        setLoggedIn(false);
        setCurrentPage("register");
    }

    // ---------------------------------------------
    // LOAD STUDENTS
    // ---------------------------------------------

    async function loadStudents() {

        try {

            const response = await fetch("/students");

            const data = await response.json();

            if (Array.isArray(data)) {
                setStudents(data);
            } else {
                setStudents([]);
            }

        } catch (error) {

            console.error("Could not load students:", error);
        }
    }

    // ---------------------------------------------
    // LOAD STUDENTS WHEN DETAILS PAGE OPENS
    // ---------------------------------------------

    useEffect(() => {

        if (loggedIn && currentPage === "details") {
            loadStudents();
        }

    }, [currentPage, loggedIn]);

    // ---------------------------------------------
    // FORM INPUT
    // ---------------------------------------------

    function handleInputChange(event) {

        const { name, value } = event.target;

        setStudent((previous) => ({
            ...previous,
            [name]: value
        }));
    }

    // ---------------------------------------------
    // ADD STUDENT
    // ---------------------------------------------

    async function handleSubmit(event) {

        event.preventDefault();

        try {

            const response = await fetch("/add_student", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(student)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {

                alert(
                    data.message ||
                    "Could not add student."
                );

                return;
            }

            // Show custom success modal
            setShowSuccess(true);

            // Clear form
            setStudent({
                name: "",
                studentNumber: "",
                email: "",
                phone: "",
                department: "",
                year: "",
                bloodGroup: ""
            });

        } catch (error) {

            console.error(error);

            alert(
                "Could not connect to the Flask server."
            );
        }
    }

    // ---------------------------------------------
    // FILTER + SEARCH + SORT
    // ---------------------------------------------

    const filteredStudents = useMemo(() => {

        let result = [...students];

        // SEARCH
        if (search.trim() !== "") {

            const searchText =
                search.toLowerCase().trim();

            result = result.filter((student) => {

                const name =
                    (student.name || "").toLowerCase();

                const studentNumber =
                    (student.student_number || "").toLowerCase();

                return (
                    name.includes(searchText) ||
                    studentNumber.includes(searchText)
                );
            });
        }

        // DEPARTMENT FILTER
        if (departmentFilter !== "all") {

            result = result.filter(
                (student) =>
                    student.department === departmentFilter
            );
        }

        // BLOOD GROUP FILTER
        if (bloodGroupFilter !== "all") {

            result = result.filter(
                (student) =>
                    student.blood_group === bloodGroupFilter
            );
        }

        // SORT
        if (sortOrder === "az") {

            result.sort((a, b) =>
                (a.name || "").localeCompare(
                    b.name || ""
                )
            );

        } else if (sortOrder === "za") {

            result.sort((a, b) =>
                (b.name || "").localeCompare(
                    a.name || ""
                )
            );
        }

        return result;

    }, [
        students,
        search,
        departmentFilter,
        bloodGroupFilter,
        sortOrder
    ]);

    // ---------------------------------------------
    // LOGIN SCREEN
    // ---------------------------------------------

    if (!loggedIn) {

        return (
            <div className="login-page">

                <div className="login-card">

                    <div className="login-icon">
                        🎓
                    </div>

                    <h1>
                        Student Details Portal
                    </h1>

                    <p>
                        Sign in with your Google account
                        to continue.
                    </p>

                    <div
                        id="google-login-button"
                        className="google-login-container"
                    ></div>

                    <p className="login-note">
                        Secure Google authentication
                    </p>

                </div>

            </div>
        );
    }

    // ---------------------------------------------
    // REGISTRATION PAGE
    // ---------------------------------------------

    if (currentPage === "register") {

        return (
            <div>

                <header className="top-header">

                    <div className="brand">
                        <span>🎓</span>
                        <h2>
                            Student Details Portal
                        </h2>
                    </div>

                    <div className="header-right">

                        {user && (
                            <div className="user-info">
                                <span>
                                    {user.name}
                                </span>
                            </div>
                        )}

                        <button
                            className="student-details-btn"
                            onClick={() =>
                                setCurrentPage("details")
                            }
                        >
                            Student Details →
                        </button>

                        <button
                            className="logout-btn"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>

                    </div>

                </header>


                <main className="main-content">

                    <section className="student-form">

                        <div className="form-header">

                            <h1>
                                Register Student
                            </h1>

                            <p>
                                Enter the student's details
                                below.
                            </p>

                        </div>


                        <form onSubmit={handleSubmit}>

                            <div className="form-group">

                                <label>
                                    Student Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={student.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter student name"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Student Number
                                </label>

                                <input
                                    type="text"
                                    name="studentNumber"
                                    value={student.studentNumber}
                                    onChange={handleInputChange}
                                    placeholder="Enter student number"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Gmail
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={student.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter Gmail address"
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={student.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter phone number"
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Department
                                </label>

                                <select
                                    name="department"
                                    value={student.department}
                                    onChange={handleInputChange}
                                >

                                    <option value="">
                                        Select Department
                                    </option>

                                    <option value="AI & DS">
                                        AI & DS
                                    </option>

                                    <option value="CSE">
                                        CSE
                                    </option>

                                    <option value="ECE">
                                        ECE
                                    </option>

                                    <option value="EEE">
                                        EEE
                                    </option>

                                    <option value="Mechanical">
                                        Mechanical
                                    </option>

                                    <option value="Civil">
                                        Civil
                                    </option>

                                </select>

                            </div>


                            <div className="form-group">

                                <label>
                                    Year
                                </label>

                                <select
                                    name="year"
                                    value={student.year}
                                    onChange={handleInputChange}
                                >

                                    <option value="">
                                        Select Year
                                    </option>

                                    <option value="1st Year">
                                        1st Year
                                    </option>

                                    <option value="2nd Year">
                                        2nd Year
                                    </option>

                                    <option value="3rd Year">
                                        3rd Year
                                    </option>

                                    <option value="4th Year">
                                        4th Year
                                    </option>

                                </select>

                            </div>


                            <div className="form-group">

                                <label>
                                    Blood Group
                                </label>

                                <select
                                    name="bloodGroup"
                                    value={student.bloodGroup}
                                    onChange={handleInputChange}
                                >

                                    <option value="">
                                        Select Blood Group
                                    </option>

                                    <option value="A+">
                                        A+
                                    </option>

                                    <option value="A-">
                                        A-
                                    </option>

                                    <option value="B+">
                                        B+
                                    </option>

                                    <option value="B-">
                                        B-
                                    </option>

                                    <option value="AB+">
                                        AB+
                                    </option>

                                    <option value="AB-">
                                        AB-
                                    </option>

                                    <option value="O+">
                                        O+
                                    </option>

                                    <option value="O-">
                                        O-
                                    </option>

                                </select>

                            </div>


                            <button
                                type="submit"
                                className="add-student-btn"
                            >
                                Add Student
                            </button>

                        </form>

                    </section>

                </main>


                {/* SUCCESS MODAL */}

                {showSuccess && (

                    <div className="modal-overlay">

                        <div className="success-modal">

                            <div className="success-icon">
                                ✓
                            </div>

                            <h2>
                                Student Added
                            </h2>

                            <p>
                                Your student has been
                                added successfully.
                            </p>

                            <button
                                className="modal-ok-btn"
                                onClick={() =>
                                    setShowSuccess(false)
                                }
                            >
                                OK
                            </button>

                        </div>

                    </div>

                )}

                <footer>
                    Student Details Portal
                </footer>

            </div>
        );
    }

    // ---------------------------------------------
    // STUDENT DETAILS PAGE
    // ---------------------------------------------

    return (
        <div>

            <header className="top-header">

                <div className="brand">

                    <span>🎓</span>

                    <h2>
                        Student Directory
                    </h2>

                </div>

                <div className="header-right">

                    {user && (
                        <div className="user-info">
                            <span>
                                {user.name}
                            </span>
                        </div>
                    )}

                    <button
                        className="back-btn"
                        onClick={() =>
                            setCurrentPage("register")
                        }
                    >
                        ← Back
                    </button>

                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </header>


            <main className="main-content">

                <section className="details-header">

                    <h1>
                        Student Details
                    </h1>

                    <p>
                        Search, filter and sort
                        registered students.
                    </p>

                </section>


                <section className="student-controls">

                    <div className="search-box">

                        <input
                            type="text"
                            placeholder="Search by name or student number..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                        />

                    </div>


                    <select
                        value={departmentFilter}
                        onChange={(event) =>
                            setDepartmentFilter(
                                event.target.value
                            )
                        }
                    >

                        <option value="all">
                            All Departments
                        </option>

                        <option value="AI & DS">
                            AI & DS
                        </option>

                        <option value="CSE">
                            CSE
                        </option>

                        <option value="ECE">
                            ECE
                        </option>

                        <option value="EEE">
                            EEE
                        </option>

                        <option value="Mechanical">
                            Mechanical
                        </option>

                        <option value="Civil">
                            Civil
                        </option>

                    </select>


                    <select
                        value={bloodGroupFilter}
                        onChange={(event) =>
                            setBloodGroupFilter(
                                event.target.value
                            )
                        }
                    >

                        <option value="all">
                            All Blood Groups
                        </option>

                        <option value="A+">
                            A+
                        </option>

                        <option value="A-">
                            A-
                        </option>

                        <option value="B+">
                            B+
                        </option>

                        <option value="B-">
                            B-
                        </option>

                        <option value="AB+">
                            AB+
                        </option>

                        <option value="AB-">
                            AB-
                        </option>

                        <option value="O+">
                            O+
                        </option>

                        <option value="O-">
                            O-
                        </option>

                    </select>


                    <select
                        value={sortOrder}
                        onChange={(event) =>
                            setSortOrder(
                                event.target.value
                            )
                        }
                    >

                        <option value="default">
                            Sort Names
                        </option>

                        <option value="az">
                            Name A → Z
                        </option>

                        <option value="za">
                            Name Z → A
                        </option>

                    </select>

                </section>


                <section className="student-list-card">

                    <div className="list-title">

                        <h2>
                            Registered Students
                        </h2>

                        <span>
                            {filteredStudents.length}
                            {" "}
                            student(s)
                        </span>

                    </div>


                    {filteredStudents.length === 0 ? (

                        <div className="empty-state">

                            <h3>
                                No students found
                            </h3>

                            <p>
                                Try changing your
                                search or filters.
                            </p>

                        </div>

                    ) : (

                        <div className="student-table-wrapper">

                            <table className="student-table">

                                <thead>

                                    <tr>

                                        <th>ID</th>

                                        <th>Name</th>

                                        <th>
                                            Student Number
                                        </th>

                                        <th>
                                            Gmail
                                        </th>

                                        <th>
                                            Phone
                                        </th>

                                        <th>
                                            Department
                                        </th>

                                        <th>
                                            Year
                                        </th>

                                        <th>
                                            Blood Group
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {filteredStudents.map(
                                        (student) => (

                                            <tr
                                                key={student.id}
                                            >

                                                <td>
                                                    {student.id}
                                                </td>

                                                <td>
                                                    {student.name}
                                                </td>

                                                <td>
                                                    {
                                                        student.student_number
                                                    }
                                                </td>

                                                <td>
                                                    {student.email}
                                                </td>

                                                <td>
                                                    {student.phone}
                                                </td>

                                                <td>
                                                    {
                                                        student.department
                                                    }
                                                </td>

                                                <td>
                                                    {student.year}
                                                </td>

                                                <td>
                                                    {
                                                        student.blood_group
                                                    }
                                                </td>

                                            </tr>

                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </section>

            </main>


            <footer>
                Student Details Portal
            </footer>

        </div>
    );
}


// ---------------------------------------------
// START REACT
// ---------------------------------------------

const root =
    ReactDOM.createRoot(
        document.getElementById("root")
    );

root.render(<App />);
<div className="creator-credit">
    Created and published by A. Dhilipan
</div>