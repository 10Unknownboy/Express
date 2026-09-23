const express = require("express");

const app = express();

app.use(express.json());

let latestPassword = null;

app.post("/password", (req, res) => {
    latestPassword = req.body.password;

    console.log("Received:", latestPassword);

    res.json({
        success: true
    });
});

app.get("/password", (req, res) => {
    res.json({
        password: latestPassword
    });
});

const PORT = process.env.PORT || 1000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});