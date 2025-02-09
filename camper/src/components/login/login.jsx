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
const Logincomponent = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    try {
      const { data } = await axios.post("http://localhost:8080/auth/login", {
        email,
        password,
      });

      console.log("API Response:", data);

      if (data.success) {
        localStorage.setItem("token", data.token);
        toast.success("Login successful!");
        console.log("Token stored:", localStorage.getItem("token"));
        navigate("/homepage");
      } else {
        toast.error(data.message || "Login failed.");
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error.response?.data?.msg ||
        error.response?.data?.error?.messages ||
        error.response?.data?.error?.msg ||
        "Server error. Please try again.";
      toast.error(errorMessage);
    }
  };
  const label = { inputProps: { "aria-label": "Checkbox demo" } };
  return (
    <div>
      <MainLog>
        <Login>
          <h2>Sign in</h2>
          <Logindiv>
            <p htmlFor="email">Email</p>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </Logindiv>
          <Logindiv>
            <p htmlFor="password">Email</p>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </Logindiv>
          <Linediv>
            <p>
              {" "}
              <Checkbox {...label} />
              Keep me logged in
            </p>
            <p>Forget your password ?</p>
          </Linediv>

          <button onClick={handleLogin}>SIGN IN</button>

          <DivOr>
            <div></div>
            <p>OR</p>
            <div></div>
          </DivOr>
          <Socialmeadia>
            <img src={Naver} alt="" />
            <img src={Google} alt="" />
            <img src={Kakaotalk} alt="" />
          </Socialmeadia>
          <Link style={{ textDecoration: "none" }} to="/sign-up">
            {" "}
            <Buutoon>CREATE ACCOUNT</Buutoon>
          </Link>
        </Login>
      </MainLog>
      <ToastContainer />
    </div>
  );
};

export default Logincomponent;
