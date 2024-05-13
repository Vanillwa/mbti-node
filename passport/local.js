const passport = require("passport");
const localStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const models = require("../models");

module.exports = () => {
	passport.use(
		new localStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, cb) => {
			let result = await models.User.findOne({ where: { email } });
			if (!result) return cb(null, false, { message: "NoExist" });
			if (result.status === 'blocked') {
				const now = new Date()
				if (now > result.blockDate) {
					await models.User.update({ status: 'ok', blockDate: null }, { where: { userId: result.userId } })
				} else {
					return cb(null, false, { message: "blocked", blockDate: result.blockDate });
				}
			}
			if (await bcrypt.compare(password, result.password)) return cb(null, result);
			return cb(null, false, { message: "PwdFail" });
		})
	);
}
