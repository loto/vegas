const {
  ComponentDialog,
  WaterfallDialog
} = require('botbuilder-dialogs')

const SHOW_DIALOG = 'showDialog'

class ShowDialog extends ComponentDialog {
  constructor (dialogId, userSessionAccessor) {
    super(dialogId)

    if (!dialogId) throw new Error('Missing parameter.  dialogId is required')
    if (!userSessionAccessor) throw new Error('Missing parameter.  userSessionAccessor is required')

    this.addDialog(
      new WaterfallDialog(SHOW_DIALOG, [
        this.show.bind(this)
      ])
    )

    this.userSessionAccessor = userSessionAccessor
  }

  async show (step) {
    let userSession = await this.userSessionAccessor.get(step.context)
    if (userSession === undefined) {
      await step.context.sendActivity(`You need to be signed in to see your password.`)
    } else {
      await step.context.sendActivity(userSession.password)
    }

    return step.endDialog()
  }
}

exports.ShowDialog = ShowDialog
exports.SHOW_DIALOG = SHOW_DIALOG
