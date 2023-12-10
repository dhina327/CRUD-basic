const express = require("express");
const app = express();
const path = require("path");
app.use(express.json());

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const dbPath = path.join(__dirname, "twitterClone.db");

let dataBase = "";

const initializeServerAndDatabase = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Connected At http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error in ${e.message}`);
    process.exit(1);
  }
};
initializeServerAndDatabase();

const authentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const listAllUserWithTweet = (eachItems) => {
  return {
    username: eachItems.username,
    tweet: eachItems.tweet,
    dataTime: eachItems.date_time,
  };
};

app.post("/register/", async (request, response) => {
  const { username, password, gender, name } = request.body;
  const passwordConvert = await bcrypt.hash(password, 10);
  const finder = `
    SELECT*
    FROM
    user
    WHERE
    username='${username}'`;
  const db = await dataBase.get(finder);

  if (db === undefined) {
    const userRegisterQuery = `
        INSERT INTO 
        user(name, username, password, gender)
        VALUES(
            '${name}',
            '${username}',
            '${passwordConvert}',
            '${gender}')`;
    if (password.length > 6) {
      await dataBase.run(userRegisterQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const finder = `
    SELECT*
    FROM
    user
    WHERE
    username='${username}'`;
  const db = await dataBase.get(finder);
  const passwordCheck = await bcrypt.compare(password, db.password);
  if (db === undefined) {
    response.send("Invalid user");
    response.status(400);
  } else {
    if (passwordCheck) {
      const payload = {
        username: username,
      };
      const token = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ token });
    } else {
      response.send("Invalid password");
    }
  }
});

app.get("/user/tweets/feed/", authentication, async (request, response) => {
  const userTweetsQuery = `
    SELECT
    username,
    tweet.tweet,
    tweet.date_time
    FROM
    user JOIN tweet
    ORDER BY
    tweet.tweet DESC
    LIMIT 4`;
  const user = await dataBase.all(userTweetsQuery);
  response.send(user.map((eachItems) => listAllUserWithTweet(eachItems)));
});

app.get("/user/following/", async (request, response) => {
  const userFollowerQuery = `
    SELECT
    user.name
    FROM
    follower JOIN user`;
  const follower = await dataBase.all(userFollowerQuery);
  response.send(follower.map((eachItems) => ({ name: eachItems.name })));
});

module.exports = app;
