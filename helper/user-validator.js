const { check, body } = require("express-validator");

exports.userSignUpValidator = () => {
  return [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Must be a valid email address !"),

    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 6 characters long."),
    body("username").trim().isEmpty().withMessage("Must provide username !"),
    body("mobile").trim().isEmpty().withMessage("Must provide mobile number !"),
  ];
};

// exports.userSignInValidator = () => {
//   return [
//     check("email", "Email is required").isEmail(),
//     check("password", "Password is requried").isLength({ min: 8 }),
//   ];
// };

exports.userSignInValidator = () => {
  return [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Must be a valid email address !"),

    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 6 characters long."),
  ];
};
