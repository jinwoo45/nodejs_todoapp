let router = require("express").Router();

function 로그인했니(req, res, next) {
  if (req.user) {
    next();
  } else {
    res.send("로그인안하셨는데요?");
  }
}

router.use("/shirts", 로그인했니);

router.get("/shirts", function (req, res) {
  res.send("셔츠 파는 페이지입니다.");
});

router.get("/pants", function (req, res) {
  res.send("바지 파는 페이지입니다.");
});

module.exports = router;
