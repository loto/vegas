const { CardFactory } = require('botbuilder')
const HelpCard = require('./resources/helpCard.json')
const helpCard = CardFactory.adaptiveCard(HelpCard)

exports.HelpCard = helpCard
