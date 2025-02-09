// import React, { useState } from "react";
// import Checkbox from "@mui/material/Checkbox";
// import { Linediv, Login, Logindiv, MainLog, Regisdiv } from "./loginstyle";

// import { Link, useNavigate } from "react-router-dom";

// const Singupcomponent = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     phone: "",
//     password: "",
//   });
//   const [message, setMessage] = useState("");
//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const response = await axios.post(
//         "http://localhost:5000/api/auth/signup",
//         formData
//       );
//       setMessage("Sign-up successful! Redirecting...");
//       setTimeout(() => navigate("/homepage"), 2000); // Redirect to project page
//     } catch (error) {
//       setMessage(error.response?.data?.message || "Sign-up failed");
//     }
//   };
//   return (
//     <div>
//       <MainLog>
//         <Login>
//           <Regisdiv>
//             <h2>Registrate</h2>
//             <Link style={{ textDecoration: "none" }} to="/">
//               {" "}
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 width="22"
//                 height="22"
//                 viewBox="0 0 22 22"
//                 fill="none"
//               >
//                 <path
//                   fill-rule="evenodd"
//                   clip-rule="evenodd"
//                   d="M4.72246 4.72254C4.92874 4.51632 5.20848 4.40047 5.50016 4.40047C5.79184 4.40047 6.07157 4.51632 6.27786 4.72254L11.0002 9.44484L15.7225 4.72254C15.8239 4.61747 15.9453 4.53367 16.0795 4.47602C16.2137 4.41837 16.3581 4.38803 16.5041 4.38676C16.6502 4.38549 16.795 4.41332 16.9302 4.46863C17.0654 4.52394 17.1882 4.60562 17.2915 4.7089C17.3948 4.81218 17.4765 4.935 17.5318 5.07019C17.5871 5.20537 17.6149 5.35022 17.6136 5.49628C17.6124 5.64233 17.582 5.78668 17.5244 5.92088C17.4667 6.05508 17.3829 6.17646 17.2779 6.27794L12.5556 11.0002L17.2779 15.7225C17.4782 15.93 17.5891 16.2079 17.5866 16.4963C17.5841 16.7847 17.4684 17.0606 17.2645 17.2645C17.0605 17.4685 16.7846 17.5842 16.4962 17.5867C16.2078 17.5892 15.9299 17.4783 15.7225 17.2779L11.0002 12.5556L6.27786 17.2779C6.07039 17.4783 5.79253 17.5892 5.50411 17.5867C5.2157 17.5842 4.9398 17.4685 4.73586 17.2645C4.53191 17.0606 4.41622 16.7847 4.41371 16.4963C4.41121 16.2079 4.52208 15.93 4.72246 15.7225L9.44476 11.0002L4.72246 6.27794C4.51624 6.07165 4.40039 5.79192 4.40039 5.50024C4.40039 5.20856 4.51624 4.92882 4.72246 4.72254Z"
//                   fill="#373737"
//                 />
//               </svg>
//             </Link>
//           </Regisdiv>
//           <Logindiv>
//             <p>Name</p>

//             <input type="text" placeholder="Your Name" />
//           </Logindiv>
//           <Logindiv>
//             <p>Family Name</p>

//             <input type="text" placeholder="Your Family Name" />
//           </Logindiv>
//           <Logindiv>
//             <p>Your Number</p>

//             <input type="number" placeholder="Your Phone Number" />
//           </Logindiv>
//           <Logindiv>
//             <p>Email</p>

//             <input type="text" placeholder="Your email" />
//           </Logindiv>
//           <Logindiv>
//             <p>Password</p>

//             <input type="password" placeholder="Your password" />
//           </Logindiv>
//           <Logindiv>
//             <p>Repeat your password</p>

//             <input type="password" placeholder="Your password" />
//           </Logindiv>
//           <Linediv>
//             <p>
//               {" "}
//               <Checkbox />
//               Keep me logged in
//             </p>
//           </Linediv>
//           <button>REGISTRATE</button>
//           <button className="backLogin">Back to log in</button>
//         </Login>
//       </MainLog>
//     </div>
//   );
// };

// export default Singupcomponent;
// import React, { useState } from "react";
// import Checkbox from "@mui/material/Checkbox";
// import { Link, useNavigate } from "react-router-dom";
// import axios from "axios"; // Make sure axios is imported
// import { Linediv, Login, Logindiv, MainLog, Regisdiv } from "./loginstyle";

// const SignupComponent = () => {
//   const navigate = useNavigate();
//   const [formData, setFormData] = useState({
//     first_name: "",
//     last_name: "",
//     email: "",
//     phone: "",
//     password: "",
//     confirmPassword: "",
//   });
//   const [message, setMessage] = useState("");

//   const handleChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     console.log("Sending data:", formData); // Debugging line

//     try {
//       const response = await axios.post(
//         "http://localhost:8080/auth/sing-up",
//         formData,
//         {
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       );
//       console.log("Server response:", response.data);
//       setMessage("Sign-up successful! Redirecting...");
//       setTimeout(() => navigate("/"), 2000);
//     } catch (error) {
//       console.error("Error response:", error.response?.data);
//       setMessage(error.response?.data?.message || "Sign-up failed");
//     }
//   };
//   return (
//     <MainLog>
//       <Login>
//         <form onSubmit={handleSubmit}>
//           <Regisdiv>
//             <h2>Register</h2>
//             <Link style={{ textDecoration: "none" }} to="/">
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 width="22"
//                 height="22"
//                 viewBox="0 0 22 22"
//                 fill="none"
//               >
//                 <path
//                   fillRule="evenodd"
//                   clipRule="evenodd"
//                   d="M4.72246 4.72254C4.92874 4.51632 5.20848 4.40047 5.50016 4.40047C5.79184 4.40047 6.07157 4.51632 6.27786 4.72254L11.0002 9.44484L15.7225 4.72254C15.8239 4.61747 15.9453 4.53367 16.0795 4.47602C16.2137 4.41837 16.3581 4.38803 16.5041 4.38676C16.6502 4.38549 16.795 4.41332 16.9302 4.46863C17.0654 4.52394 17.1882 4.60562 17.2915 4.7089C17.3948 4.81218 17.4765 4.935 17.5318 5.07019C17.5871 5.20537 17.6149 5.35022 17.6136 5.49628C17.6124 5.64233 17.582 5.78668 17.5244 5.92088C17.4667 6.05508 17.3829 6.17646 17.2779 6.27794L12.5556 11.0002L17.2779 15.7225C17.4782 15.93 17.5891 16.2079 17.5866 16.4963C17.5841 16.7847 17.4684 17.0606 17.2645 17.2645C17.0605 17.4685 16.7846 17.5842 16.4962 17.5867C16.2078 17.5892 15.9299 17.4783 15.7225 17.2779L11.0002 12.5556L6.27786 17.2779C6.07039 17.4783 5.79253 17.5892 5.50411 17.5867C5.2157 17.5842 4.9398 17.4685 4.73586 17.2645C4.53191 17.0606 4.41622 16.7847 4.41371 16.4963C4.41121 16.2079 4.52208 15.93 4.72246 15.7225L9.44476 11.0002L4.72246 6.27794C4.51624 6.07165 4.40039 5.79192 4.40039 5.50024C4.40039 5.20856 4.51624 4.92882 4.72246 4.72254Z"
//                   fill="#373737"
//                 />
//               </svg>
//             </Link>
//           </Regisdiv>

//           <Logindiv>
//             <p>First Name</p>
//             <input
//               type="text"
//               name="first_name"
//               value={formData.first_name}
//               onChange={handleChange}
//               placeholder="Your Name"
//               required
//             />
//           </Logindiv>

//           <Logindiv>
//             <p>Last Name</p>
//             <input
//               type="text"
//               name="last_name"
//               value={formData.last_name}
//               onChange={handleChange}
//               placeholder="Your Last Name"
//               required
//             />
//           </Logindiv>

//           <Logindiv>
//             <p>Phone Number</p>
//             <input
//               type="text"
//               name="phone"
//               value={formData.phone}
//               onChange={handleChange}
//               placeholder="Your Phone Number"
//               required
//             />
//           </Logindiv>

//           <Logindiv>
//             <p>Email</p>
//             <input
//               type="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               placeholder="Your Email"
//               required
//             />
//           </Logindiv>

//           <Logindiv>
//             <p>Password</p>
//             <input
//               type="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               placeholder="Your Password"
//               required
//             />
//           </Logindiv>

//           <Logindiv>
//             <p>Confirm Password</p>
//             <input
//               type="password"
//               name="confirmPassword"
//               value={formData.confirmPassword}
//               onChange={handleChange}
//               placeholder="Confirm Password"
//               required
//             />
//           </Logindiv>

//           <Linediv>
//             <p>
//               <Checkbox />
//               Keep me logged in
//             </p>
//           </Linediv>

//           {message && <p style={{ color: "red" }}>{message}</p>}

//           <button type="submit">REGISTER</button>
//           <button
//             type="button"
//             className="backLogin"
//             onClick={() => navigate("/")}
//           >
//             Back to Login
//           </button>
//         </form>
//       </Login>
//     </MainLog>
//   );
// };

// export default SignupComponent;
import axios from "axios";
import Checkbox from "@mui/material/Checkbox";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import {
  Buutoon,
  DivOr,
  Linediv,
  Login,
  Logindiv,
  MainLog,
  Socialmeadia,
} from "./loginstyle";
import Naver from "../../assets/623afb9327d4946aceae2faf.png";
import Google from "../../assets/google-plus.png";
import Kakaotalk from "../../assets/kakao-talk.png";
import { Link } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

const SignupComponent = () => {
  const navigate = useNavigate();
  const [first_name, setFirst_name] = useState("");
  const [last_name, setLast_name] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const handleSignup = async () => {
    if (!email || !password || !first_name || !phone) {
      toast.error("Please enter all required fields.");
      return;
    }

    try {
      console.log("Sending request to signup API...");
      const { data } = await axios.post("http://localhost:8080/auth/sign-up", {
        first_name,
        last_name,
        email,
        phone,
        password,
      });

      console.log("Signup response:", data);

      if (data.success) {
        localStorage.setItem("token", data.token);
        toast.success("Sign-up successful!");
        navigate("/homepage");
      } else {
        toast.error(data.message || "Sign-up failed.");
      }
    } catch (error) {
      console.error("Signup error:", error);

      if (error.response) {
        // Log full server response
        console.error("Server Response:", error.response.data);

        toast.error(
          error.response.data?.message ||
            error.response.data?.error ||
            "Unexpected error occurred. Please try again."
        );
      } else if (error.request) {
        // No response received
        console.error("No response received from server:", error.request);
        toast.error("Server is not responding. Please check your backend.");
      } else {
        // Other errors
        console.error("Request setup error:", error.message);
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  const label = { inputProps: { "aria-label": "Checkbox demo" } };

  return (
    <div>
      <MainLog>
        <Login>
          <h2>Sign Up</h2>
          <Logindiv>
            <p>First Name</p>
            <input
              type="text"
              name="first_name"
              value={first_name}
              onChange={(e) => setFirst_name(e.target.value)}
              placeholder="Enter your first name"
            />
          </Logindiv>
          <Logindiv>
            <p>Last Name</p>
            <input
              type="text"
              name="last_name"
              value={last_name}
              onChange={(e) => setLast_name(e.target.value)}
              placeholder="Enter your last name"
            />
          </Logindiv>
          <Logindiv>
            <p>Email</p>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </Logindiv>
          <Logindiv>
            <p>Phone Number</p>
            <input
              type="text"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
            />
          </Logindiv>
          <Logindiv>
            <p>Password</p>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </Logindiv>
          <Linediv>
            <p>
              <Checkbox {...label} /> Keep me logged in
            </p>
          </Linediv>
          <button onClick={handleSignup}>SIGN UP</button>
          <DivOr>
            <div></div>
            <p>OR</p>
            <div></div>
          </DivOr>
          <Socialmeadia>
            <img src={Naver} alt="Naver" />
            <img src={Google} alt="Google" />
            <img src={Kakaotalk} alt="Kakaotalk" />
          </Socialmeadia>
          <Link style={{ textDecoration: "none" }} to="/">
            <Buutoon>BACK TO LOGIN</Buutoon>
          </Link>
        </Login>
      </MainLog>
      <ToastContainer />
    </div>
  );
};

export default SignupComponent;
