import { Mailable } from '@gravito/signal'

export class ProfileUpdatedMail extends Mailable {
  constructor(
    private readonly userEmail: string,
    private readonly updatedFields: string[],
  ) {
    super()
  }

  build(): this {
    return this.to(this.userEmail)
      .subject('Your Profile was Updated')
      .view('emails/profile-updated', {
        fields: this.updatedFields.join(', '),
        year: new Date().getFullYear(),
      })
  }
}
