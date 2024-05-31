const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const validator = require("validator");
const app = express();
const bodyparser = require("body-parser");
const dbConnection = require("./dbConnection");
const path = require("path");
app.use(express.static(path.join(__dirname, "views")));

const session = require("express-session");
// middlenames
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
const port = 3000;
app.set("view engine", "ejs");
// _______________________For Google AI(for Ask Question) ______________________________
// app.get("/googleai", (req, res) => {
//   res.sendFile(__dirname + "/views/" + "/googleai.html"); // Make sure to pass the initial values for prompt and text
// });

app.post("/googleai", async (req, res) => {
  const genAI = new GoogleGenerativeAI(process.env.API_KEY);
  const textPrompt = req.body.prompt;
  console.log(req.body);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Given the context of 'PSL Management System'
     and the scope of information related to the Pakistan Super League (PSL), 
     cricket players, and news,
      use the Gemini-Pro model to generate a concise response consisting of five key points 
      in response to user queries. 
      Points should cover recent news,
       notable information about cricket players, 
       specific records, and any noteworthy updates about PSL. 
       If the query is not related to PSL or cricket players, 
        say your questions is not related to PSL .
        write answer only in 20 words no more than 20 word, 
        if the answer is yes or no than be specific say no or yes whatever the answer, 
        if in some cases question's answer is specific but more than
         the 20 words then write answer more than 20 words,
         always write answer according to the data you have 
          no need to say i don't have information about your question,
          if asking about team players name than write all team players  . User Query: ${textPrompt}`;
    const result = await model.generateContentStream(prompt);
    const response = await result.response;
    const text = await response.text();
    console.log(textPrompt);
    console.log(text);
    res.send({ text: text, prompt: textPrompt });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ txt: "Internet Issue , Please try again later" });
  }
});

// ___________________________For Home Page _________________________________
app.get("/", (req, res) => {
  res.render("home");
});

// ___________________________For Sign Up Page _________________________________
app.get("/signup", (req, res) => {
  res.render("signup");
});
app.post("/signup", async (req, res) => {
  const name = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  // Validate email using validator library
  if (!validator.isEmail(email)) {
    console.log("Invalid email");
    return res.status(400).send("Invalid email");
  }

  // Check password length
  if (password.length <= 7) {
    console.log("Password must be greater than 7 characters");
    return res.status(400).render("error", {
      message: "Password must be greater than 7 characters",
      message1: "Please enter password greater than 7 characters",
      link: "/signup",
    });
  }

  var sql = `INSERT INTO user_info(pname,username,passwords) VALUES ('${name}','${email}','${password}')`;

  if (name == "" || email == "" || password == "") {
    return res.status(400).send("All fields are required");
  } else {
    async function run() {
      let connection;
      try {
        connection = await dbConnection.getConnection();
        const result = await connection.execute(sql, [], { autoCommit: true });
        console.log("inserted");
      } catch (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
      } finally {
        if (connection) {
          try {
            await dbConnection.closeConnection(connection);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
    run();
    let user = [[name], [email]];
    res.render("dashboard", { user: user, welcomeMessage: "Welcome, Dear" });
  }
});

// _______________________For Login Page ______________________________
app.get("/login", (req, res) => {
  res.render("login");
});
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (email && password) {
    async function run() {
      let connection;
      try {
        connection = await dbConnection.getConnection();
        const result = await connection.execute(
          `SELECT * FROM user_info WHERE username='${email}' AND passwords='${password}'`
        );
        console.log(result.rows);
        if (result.rows.length > 0) {
          req.session.loggedin = true;
          req.session.username = email;
          // res.redirect("/dashboard");
          res.render("dashboard", {
            user: result.rows[0],
            welcomeMessage: "Welcome Back,",
          });
          // res.send("Welcome back, " + email + "!" + " <a href='/'>Home</a>");
        } else {
          res.render("error", {
            message: "Incorrect Username and/or Password!",
            message1: "Please enter correct username and password",
            link: "/login",
          });
        }
        res.end();
      } catch (err) {
        console.error(err);
      } finally {
        if (connection) {
          try {
            await dbConnection.closeConnection(connection);
            //   console.error(err);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
    run();
  } else {
    console.log(req.body);
    res.send(
      "Please enter Username and Password!" + " <a href='/login'>Login</a>"
    );
    res.end();
  }
});

// ________________________For Logout Page ______________________________
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// _______________________For About Us Page ______________________________
app.get("/about", (req, res) => {
  res.render("about");
});

// _______________________For Choice Page(Lectures) ______________________________
app.get("/choice", (req, res) => {
  res.render("choice");
});
// ______________________ For Teams Page _______________________
// GET request handler for /learnpartofspeech
app.get("/teams", (req, res) => {
  res.render("teams");
});
// Post method for teams
app.post("/teams", async (req, res) => {
  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
  // Build and execute the SQL query
  const sql = `SELECT * FROM teamname`;
  try {
    const result = await connection.execute(sql);
    // Handle results
    const teamData = result.rows.length > 0 ? result.rows : [];
    console.log(teamData);
    res.status(200).json(teamData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});
//_____________________ For Teams Manager page _________________________
// GET request handler for /teamsmanager
app.get("/teamsmanager", (req, res) => {
  res.render("teamsmanager");
});
// POST request handler for /teamsmanager
app.post("/teamsmanager", async (req, res) => {
  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
  // Build and execute the SQL query
  const sql = `SELECT * FROM teammanagers`;
  try {
    const result = await connection.execute(sql);
    // Handle results
    const teamData = result.rows.length > 0 ? result.rows : [];
    console.log(teamData);
    res.status(200).json(teamData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// _______________________For Players Page ______________________________
app.get("/players", (req, res) => {
  res.render("players");
});

// _______________________For Peshawar Zalmi Player ______________________________
app.get("/peshawerplayers", (req, res) => {
  res.render("peshawerplayers");
});

app.post("/peshawerplayers", async (req, res) => {
  // Get the word from the request body
  const word = "Peshawar Zalmi";
  // Validate if the word is empty
  if (!word || word.trim() === "") {
    res.status(400).send("Please provide a valid word");
    return;
  }
  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
  // Build and execute the SQL query
  const sql = `SELECT * FROM players WHERE team = :word`;
  try {
    const result = await connection.execute(
      sql,
      { word: word },
      { autoCommit: true }
    );
    // Handle results
    const playersData = result.rows.length > 0 ? result.rows : [];
    console.log(playersData);
    res.status(200).json(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// _____________________For Islamabad United Player ____________________________
app.get("/islamabadplayers", (req, res) => {
  res.render("islamabadplayers");
});
// POST endpoint for fetching players data
app.post("/islamabadplayers", async (req, res) => {
  // Get the word from the request body
  const word = req.body.word || "Islamabad United";

  // Validate if the word is empty
  if (!word || word.trim() === "") {
    res.status(400).send("Please provide a valid word");
    return;
  }

  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Build and execute the SQL query
  const sql = `SELECT * FROM players WHERE team = :word`;

  try {
    const result = await connection.execute(
      sql,
      { word: word },
      { autoCommit: true }
    );

    // Handle results
    const playersData = result.rows.length > 0 ? result.rows : [];
    console.log(playersData);

    res.status(200).json(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// _______________________For Karachi Kings Player ______________________________
app.get("/karachiplayers", (req, res) => {
  res.render("karachiplayers");
});

// POST endpoint for fetching players data
app.post("/karachiplayers", async (req, res) => {
  // Get the word from the request body
  const word = "Karachi Kings";

  // Validate if the word is empty
  if (!word || word.trim() === "") {
    res.status(400).send("Please provide a valid word");
    return;
  }

  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Build and execute the SQL query
  const sql = `SELECT * FROM players WHERE team = :word`;

  try {
    const result = await connection.execute(
      sql,
      { word: word },
      { autoCommit: true }
    );

    // Handle results
    const playersData = result.rows.length > 0 ? result.rows : [];
    console.log(playersData);

    res.status(200).json(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});
// _______________________For Quetta Gladiators ______________________________
app.get("/quettaplayers", (req, res) => {
  res.render("quettaplayers");
});

app.post("/quettaplayers", async (req, res) => {
  // Get the word from the request body
  const word = "Quetta Gladiators";

  // Validate if the word is empty
  if (!word || word.trim() === "") {
    res.status(400).send("Please provide a valid word");
    return;
  }

  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Build and execute the SQL query
  const sql = `SELECT * FROM players WHERE team = :word`;

  try {
    const result = await connection.execute(
      sql,
      { word: word },
      { autoCommit: true }
    );

    // Handle results
    const playersData = result.rows.length > 0 ? result.rows : [];
    console.log(playersData);

    res.status(200).json(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// _______________________For Lahore Qalandars ______________________________

app.get("/lahoreplayers", (req, res) => {
  res.render("lahoreplayers");
});
// POST endpoint for fetching players data
app.post("/lahoreplayers", async (req, res) => {
  // Get the word from the request body
  const word = "Lahore Qalandars";
  // Validate if the word is empty
  if (!word || word.trim() === "") {
    res.status(400).send("Please provide a valid word");
    return;
  }
  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
  // Build and execute the SQL query
  const sql = `SELECT * FROM players WHERE team = :word`;
  try {
    const result = await connection.execute(
      sql,
      { word: word },
      { autoCommit: true }
    );
    // Handle results
    const playersData = result.rows.length > 0 ? result.rows : [];
    console.log(playersData);
    res.status(200).json(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});
// _______________________For Multan Sultans ______________________________

app.get("/multanplayers", (req, res) => {
  res.render("multanplayers");
});
app.post("/multanplayers", async (req, res) => {
  // Get the word from the request body
  const word = "Multan Sultans";

  // Validate if the word is empty
  if (!word || word.trim() === "") {
    res.status(400).send("Please provide a valid word");
    return;
  }

  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Build and execute the SQL query
  const sql = `SELECT * FROM players WHERE team = :word`;

  try {
    const result = await connection.execute(
      sql,
      { word: word },
      { autoCommit: true }
    );

    // Handle results
    const playersData = result.rows.length > 0 ? result.rows : [];
    console.log(playersData);

    res.status(200).json(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// _____________________For Matches Page ____________________________
app.get("/matches", (req, res) => {
  res.render("matches");
});

app.post("/matches", async (req, res) => {
  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Build and execute the SQL query
  const sql = `SELECT * FROM match order by m_no asc`;

  try {
    const result = await connection.execute(sql);

    // Handle results
    const matchesDetails =
      result.rows.length > 0 ? result.rows : "No Matches Found from database";
    console.log(matchesDetails);

    res.status(200).json(matchesDetails);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// _____________________For Viewers Page ____________________________
app.get("/viewers", (req, res) => {
  res.render("viewers");
});

app.post("/viewers", async (req, res) => {
  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Build and execute the SQL query
  const sql = `SELECT * FROM viewers  order by ticketid asc`;

  try {
    const result = await connection.execute(sql);

    // Handle results
    const viewersDetails =
      result.rows.length > 0 ? result.rows : "No viewers Found from database";
    console.log(viewersDetails);

    res.status(200).json(viewersDetails);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});
// __________________________Add viewer to database____________________
app.post("/addviewer", async (req, res) => {
  const name = req.body.name;
  const id = req.body.id;
  const phone = req.body.phone;
  const tId = req.body.tId;
  const seat = Math.floor(Math.random() * 100) + 1;
  const nationality = "pakistani";

  console.log(name, id, phone, tId);

  const sql = `INSERT INTO viewers(Viewername, Viewercnic, contactno, ticketid,seatno,viewernationality) VALUES ('${name}', '${id}', '${phone}', '${tId}','${seat}','${nationality}')`;

  if (!name || !id || !phone || !tId) {
    return res.status(400).send("All fields are required");
  }

  try {
    const connection = await dbConnection.getConnection();
    const result = await connection.execute(sql, [], { autoCommit: true });
    console.log("Viewer inserted");
    res.json({ message: "Viewer added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// _____________________For Deleting Viewer Entry ____________________________
app.post("/deleteweddingevent/:eventId", async (req, res) => {
  const eventId = req.params.eventId;

  const sql = `DELETE FROM viewers WHERE seatno = '${eventId}'`;

  try {
    const connection = await dbConnection.getConnection();
    const result = await connection.execute(sql, [], { autoCommit: true });

    if (result.rowsAffected > 0) {
      console.log(`Viewer Deleted with ID ${eventId} deleted`);
      res.json({ message: "Viewer deleted successfully" });
    } else {
      res.status(404).json({ error: "Viewer not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.render("dashboard");
});

//_____________________ For Grounds page _________________________
// GET request handler
app.get("/grounds", (req, res) => {
  res.render("grounds");
});
// POST request handler for
app.post("/grounds", async (req, res) => {
  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }
  // Build and execute the SQL query
  const sql = `SELECT * FROM grounds`;
  try {
    const result = await connection.execute(sql);
    // Handle results
    const teamData = result.rows.length > 0 ? result.rows : [];
    console.log(teamData);
    res.status(200).json(teamData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

app.get("/search", (req, res) => {
  res.render("search");
});

// POST endpoint for fetching players data
app.post("/search", async (req, res) => {
  // Get the word from the request body
  const word = req.body.search;

  // Validate if the word is empty
  if (!word || word.trim() === "") {
    res.status(400).send("Please provide a valid word");
    return;
  }

  // Connect to the database
  let connection;
  try {
    connection = await dbConnection.getConnection(); // Adjust this based on your database connection logic
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
    return;
  }

  // Build and execute the SQL query
  const sql = `SELECT * FROM players WHERE team = :word`;

  try {
    const result = await connection.execute(
      sql,
      { word: word },
      { autoCommit: true }
    );

    // Handle results
    const playersData = result.rows.length > 0 ? result.rows : [];
    console.log(playersData);

    res.status(200).json(playersData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  } finally {
    // Close the connection
    if (connection) {
      try {
        await dbConnection.closeConnection(connection);
      } catch (err) {
        console.error(err);
      }
    }
  }
});

// Serve the HTML page
app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
