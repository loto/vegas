class UserSession {
  constructor (password) {
    this.password = password || this.generateRandomString(6)
  }

  reset () {
    let newPassword = this.generateRandomString(6)
    this.password = newPassword
    return newPassword
  }

  generateRandomString (length) {
    return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, length)
  }
}

exports.UserSession = UserSession
