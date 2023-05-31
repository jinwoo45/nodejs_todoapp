//express 설정
const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: true }));

//methodoveride
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

//view 엔진 설정
app.use("/public", express.static("public"));
app.set("view engine", "ejs");

//환경변수 설정
require("dotenv").config();

//몽고디비 설정
const MongoClient = require("mongodb").MongoClient;
let db;

let uri =
  "mongodb+srv://admin:nodejs1234@cluster0.1nskvwn.mongodb.net/?retryWrites=true&w=majority";

MongoClient.connect(uri, function (err, client) {
  if (err) return console.log("DB연결 에러", err);

  console.log("DB연결 성공");
  db = client.db("todoapp");

  app.listen(8080, function () {
    console.log("listening on 80");
  });
});

//html 파일 렌더링
app.get("/", function (req, res) {
  db.collection("post")
    .find()
    .toArray(function (err, res) {});
  res.render("index.ejs", { posts: res });
});
app.get("/write", function (req, res) {
  res.render("write.ejs");
});

app.get("/detail/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, res) {
      console.log(res);
      res.render("detail.ejs", { data: res });
    }
  );
});

app.get("/edit/:id", function (req, res) {
  db.collection("post").findOne(
    { _id: parseInt(req.params.id) },
    function (err, res) {
      console.log(res);
      res.render("edit.ejs", { post: res });
    }
  );
});

app.put("/edit", function (req, res) {
  db.collection("post").updateOne(
    { _id: parseInt(req.body.id) },
    { $set: { 제목: req.body.title, 날짜: req.body.date } },
    function (err, res) {
      console.log("수정완료");
      res.redirect("/list");
    }
  );
});

//로그인 로직

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);

app.use(passport.initialize());
app.use(passport.session());

app.get("/login", function (req, res) {
  res.render("login.ejs");
});
app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/fail" }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get("/mypage", isLogin, function (req, res) {
  console.log(req.user);
  res.render("mypage.ejs", { 사용자: req.user });
});

function isLogin(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("로그인안하셨는데요?");
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (입력한아이디, 입력한비번, done) {
      //console.log(입력한아이디, 입력한비번);
      db.collection("login").findOne({ id: 입력한아이디 }, function (err, res) {
        if (err) return done(err);

        if (!res)
          return done(null, false, { message: "존재하지않는 아이디요" });
        if (입력한비번 == res.pw) {
          return done(null, res);
        } else {
          return done(null, false, { message: "비번틀렸어요" });
        }
      });
    }
  )
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (아이디, done) {
  db.collection("login").findOne({ id: 아이디 }, function (err, res) {
    done(null, res);
  });
});

//게시판 추가
app.post("/add", function (req, res) {
  // res.send("전송완료");

  db.collection("counter").findOne(
    {
      name: "게시물갯수",
    },
    function (err, res) {
      console.log(res.totalPost);
      let 총게시물갯수 = res.totalPost;

      let 저장할거 = {
        _id: 총게시물갯수 + 1,
        제목: req.body.title,
        날짜: req.body.date,
        작성자: req.user._id,
      };

      db.collection("post").insertOne(저장할거, function (err, res) {
        console.log("저장완료");
        //counter라는 콜렉션에 있는 totalPost 라는 항목도 1 증가시켜야함(수정);
        db.collection("counter").updateOne(
          { name: "게시물갯수" },
          { $inc: { totalPost: 1 } },
          function (err, res) {
            if (err) {
              return console.log(err);
            }
          }
        );
      });
      res.redirect("/list");
    }
  );
});

//게시판 삭제
app.delete("/delete", function (req, res) {
  console.log(req.body);
  req.body._id = parseInt(req.body._id);

  let 삭제할데이터 = { _id: req.body._id, 작성자: req.user._id };

  db.collection("post").deleteOne(삭제할데이터, function (err, res) {
    console.log("삭제완료");
    res.status(200).send({ message: "성공했습니다" });
  });
});

app.get("/search", (req, res) => {
  let 검색조건 = [
    {
      $search: {
        index: "titleSearch",
        text: {
          query: req.query.value,
          path: "제목", // 제목날짜 둘다 찾고 싶으면 ['제목', '날짜']
        },
      },
    },
  ];
  db.collection("post")
    .aggregate(검색조건)
    .toArray((err, res) => {
      console.log(res);
      res.render("search.ejs", { posts: res });
    });
});

app.post("/register", function (req, res) {
  db.collection("login").insertOne(
    { id: req.body.id, pw: req.body.pw },
    function (err, res) {
      res.redirect("/");
    }
  );
});

app.use("/shop", require("./routes/shop.js")); //미들웨어
app.use("/board/sub", require("./routes/board.js")); //미들웨어

//이미지 업로드
let multer = require("multer");
let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/image");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

let upload = multer({ storage: storage });

app.get("/upload", function (req, res) {
  res.render("upload.ejs");
});

app.post("/upload", upload.array("profile", 10), function (req, res) {
  res.send("업로드완료");
});

app.get("/image/:imageName", function (req, res) {
  res.sendFile(__dirname + "/public/image/" + req.params.imageName);
});
