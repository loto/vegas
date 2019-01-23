const { CardFactory } = require('botbuilder')
const ErrorCard = require('./resources/errorCard.json')
const errorCard = CardFactory.adaptiveCard(ErrorCard)

exports.ErrorCard = errorCard
