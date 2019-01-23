const { CardFactory } = require('botbuilder')
const WelcomeCard = require('./resources/welcomeCard.json')
const welcomeCard = CardFactory.adaptiveCard(WelcomeCard)

exports.WelcomeCard = welcomeCard
