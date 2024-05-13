const passport = require("passport");
const models = require("../models");
const local = require('./local')

module.exports = () => {
	local()

	passport.serializeUser((user, done) => {
		process.nextTick(() => {
			done(null, user.userId);
		});
	});

	passport.deserializeUser(async (userId, done) => {
		const user = await models.User.findByPk(userId);
		process.nextTick(() => {
			return done(null, user);
		});
	});
}