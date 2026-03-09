import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('email.host');
    const port = config.get<number>('email.port', 587);
    const user = config.get<string>('email.user');
    const pass = config.get<string>('email.pass');

    this.frontendUrl = config.get<string>('frontend.url', 'http://localhost:3000');
    this.fromAddress = `Милый Дом <${user ?? 'noreply@milyidom.com'}>`;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email transport configured: ${host}:${port}`);
    } else {
      this.transporter = null;
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    await this.send({
      to: email,
      subject: 'Подтвердите email — Милый Дом',
      html: this.layout(`
        <h1>Подтвердите email</h1>
        <p>Вы зарегистрировались на платформе <strong>Милый Дом</strong>. Осталось подтвердить вашу электронную почту.</p>
        <p>Нажмите кнопку ниже. Ссылка действительна 24 часа.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${verifyUrl}" class="btn">Подтвердить email</a>
        </div>
        <p style="color:#888;font-size:13px">Если вы не регистрировались на Милый Дом, просто проигнорируйте это письмо.</p>
      `),
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    await this.send({
      to: email,
      subject: 'Сброс пароля — Милый Дом',
      html: this.passwordResetTemplate(resetUrl),
    });
  }

  async sendWelcome(email: string, firstName: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Добро пожаловать в Милый Дом, ${firstName}!`,
      html: this.welcomeTemplate(firstName),
    });
  }

  async sendBookingConfirmation(opts: {
    to: string;
    guestName: string;
    listingTitle: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    currency: string;
    bookingId: string;
  }): Promise<void> {
    await this.send({
      to: opts.to,
      subject: `Бронирование подтверждено — ${opts.listingTitle}`,
      html: this.bookingConfirmationTemplate(opts),
    });
  }

  async sendBookingRequest(opts: {
    to: string;
    hostName: string;
    guestName: string;
    listingTitle: string;
    checkIn: Date;
    checkOut: Date;
    bookingId: string;
  }): Promise<void> {
    await this.send({
      to: opts.to,
      subject: `Новый запрос на бронирование — ${opts.listingTitle}`,
      html: this.bookingRequestTemplate(opts),
    });
  }

  async sendBookingCancellation(opts: {
    to: string;
    recipientName: string;
    listingTitle: string;
    checkIn: Date;
    bookingId: string;
  }): Promise<void> {
    await this.send({
      to: opts.to,
      subject: `Бронирование отменено — ${opts.listingTitle}`,
      html: this.bookingCancellationTemplate(opts),
    });
  }

  async sendSuperhostPromotion(email: string, firstName: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Поздравляем! Вы стали Суперхостом — Милый Дом',
      html: this.layout(`
        <h1>🌟 Вы — Суперхост!</h1>
        <p>Здравствуйте, ${firstName}!</p>
        <p>Поздравляем — вы достигли статуса <strong>Суперхоста</strong> на платформе Милый Дом!</p>
        <p>Это означает, что гости особенно ценят вашу заботу, чистоту и общение. Спасибо, что делаете наш сервис лучше!</p>
        <div class="info-box">
          <p>✅ Рейтинг ≥ 4.8</p>
          <p>✅ Не менее 10 отзывов</p>
          <p>Ваши объявления теперь отмечены значком <strong>Суперхост</strong>.</p>
        </div>
        <p style="color:#888;font-size:13px">Продолжайте в том же духе — и гости вернутся снова!</p>
      `),
    });
  }

  async sendPayoutNotification(opts: {
    to: string;
    hostName: string;
    amountFormatted: string;
    bookingId: string;
  }): Promise<void> {
    await this.send({
      to: opts.to,
      subject: `Выплата ${opts.amountFormatted} — Милый Дом`,
      html: this.layout(`
        <h1>Выплата отправлена!</h1>
        <p>Здравствуйте, ${opts.hostName}!</p>
        <p>Мы перевели вам <strong>${opts.amountFormatted}</strong> за бронирование.</p>
        <div class="info-box">
          <p><strong>ID бронирования:</strong> <code>${opts.bookingId}</code></p>
          <p><strong>Сумма:</strong> ${opts.amountFormatted}</p>
        </div>
        <p style="color:#888;font-size:13px">Средства поступят на ваш счёт в течение 1–3 рабочих дней.</p>
      `),
    });
  }

  async sendSavedSearchAlert(opts: {
    email: string;
    firstName: string;
    searchName: string;
    newCount: number;
    searchUrl: string;
  }): Promise<void> {
    await this.send({
      to: opts.email,
      subject: `${opts.newCount} новых объявлений по запросу «${opts.searchName}» — Милый Дом`,
      html: this.layout(`
        <h1>Новые объявления по вашему запросу</h1>
        <p>Здравствуйте, ${opts.firstName}!</p>
        <p>По сохранённому запросу <strong>«${opts.searchName}»</strong> появилось <strong>${opts.newCount}</strong> новых объявлений.</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${opts.searchUrl}" class="btn">Смотреть объявления</a>
        </div>
        <p style="color:#888;font-size:13px">Вы получаете это письмо потому, что сохранили данный поиск. Управляйте уведомлениями в разделе «Сохранённые поиски».</p>
      `),
    });
  }

  async sendNewsletterWelcome(email: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'Вы подписались на рассылку — Милый Дом',
      html: this.layout(`
        <h1>Добро пожаловать в рассылку!</h1>
        <p>Вы успешно подписались на рассылку <strong>Милый Дом</strong>.</p>
        <p>Мы будем присылать вам лучшие предложения по аренде жилья и эксклюзивные спецпредложения.</p>
        <p style="color:#888;font-size:13px">Если вы не подписывались, просто проигнорируйте это письмо.</p>
      `),
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async send(opts: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      // Log to console in development when SMTP is not configured
      this.logger.debug(
        `[EMAIL] To: ${opts.to} | Subject: ${opts.subject}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (err) {
      // Never let email failures crash the app
      this.logger.error(`Failed to send email to ${opts.to}: ${String(err)}`);
    }
  }

  private passwordResetTemplate(resetUrl: string): string {
    return this.layout(`
      <h1>Сброс пароля</h1>
      <p>Вы запросили сброс пароля для вашего аккаунта Милый Дом.</p>
      <p>Нажмите кнопку ниже, чтобы установить новый пароль. Ссылка действительна 1 час.</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${resetUrl}" class="btn">Сбросить пароль</a>
      </div>
      <p style="color:#888;font-size:13px">Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
    `);
  }

  private welcomeTemplate(firstName: string): string {
    const homeUrl = this.frontendUrl;
    return this.layout(`
      <h1>Добро пожаловать, ${firstName}!</h1>
      <p>Мы рады приветствовать вас в <strong>Милый Дом</strong> — платформе для комфортной аренды жилья.</p>
      <p>Теперь вы можете:</p>
      <ul>
        <li>Искать и бронировать уютное жильё по всей России</li>
        <li>Становиться хостом и зарабатывать на сдаче своего жилья</li>
        <li>Оставлять отзывы и читать мнения других гостей</li>
      </ul>
      <div style="text-align:center;margin:32px 0">
        <a href="${homeUrl}" class="btn">Начать</a>
      </div>
    `);
  }

  private bookingConfirmationTemplate(opts: {
    guestName: string;
    listingTitle: string;
    checkIn: Date;
    checkOut: Date;
    totalPrice: number;
    currency: string;
    bookingId: string;
  }): string {
    const bookingUrl = `${this.frontendUrl}/bookings`;
    const nights = Math.round(
      (opts.checkOut.getTime() - opts.checkIn.getTime()) / 86_400_000,
    );
    return this.layout(`
      <h1>Бронирование подтверждено!</h1>
      <p>Здравствуйте, ${opts.guestName}!</p>
      <p>Ваше бронирование успешно подтверждено.</p>
      <div class="info-box">
        <p><strong>Объект:</strong> ${opts.listingTitle}</p>
        <p><strong>Заезд:</strong> ${this.formatDate(opts.checkIn)}</p>
        <p><strong>Выезд:</strong> ${this.formatDate(opts.checkOut)}</p>
        <p><strong>Ночей:</strong> ${nights}</p>
        <p><strong>Итого:</strong> ${opts.totalPrice.toLocaleString('ru-RU')} ${opts.currency}</p>
        <p><strong>ID бронирования:</strong> <code>${opts.bookingId}</code></p>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${bookingUrl}" class="btn">Мои бронирования</a>
      </div>
    `);
  }

  private bookingRequestTemplate(opts: {
    hostName: string;
    guestName: string;
    listingTitle: string;
    checkIn: Date;
    checkOut: Date;
    bookingId: string;
  }): string {
    const bookingsUrl = `${this.frontendUrl}/host/bookings`;
    const nights = Math.round(
      (opts.checkOut.getTime() - opts.checkIn.getTime()) / 86_400_000,
    );
    return this.layout(`
      <h1>Новый запрос на бронирование</h1>
      <p>Здравствуйте, ${opts.hostName}!</p>
      <p>Гость <strong>${opts.guestName}</strong> хочет забронировать ваше жильё.</p>
      <div class="info-box">
        <p><strong>Объект:</strong> ${opts.listingTitle}</p>
        <p><strong>Заезд:</strong> ${this.formatDate(opts.checkIn)}</p>
        <p><strong>Выезд:</strong> ${this.formatDate(opts.checkOut)}</p>
        <p><strong>Ночей:</strong> ${nights}</p>
      </div>
      <div style="text-align:center;margin:32px 0">
        <a href="${bookingsUrl}" class="btn">Ответить на запрос</a>
      </div>
    `);
  }

  private bookingCancellationTemplate(opts: {
    recipientName: string;
    listingTitle: string;
    checkIn: Date;
    bookingId: string;
  }): string {
    return this.layout(`
      <h1>Бронирование отменено</h1>
      <p>Здравствуйте, ${opts.recipientName}!</p>
      <p>Бронирование <strong>${opts.listingTitle}</strong> на <strong>${this.formatDate(opts.checkIn)}</strong> было отменено.</p>
      <p style="color:#888;font-size:13px">ID: ${opts.bookingId}</p>
    `);
  }

  private layout(content: string): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #e11d48, #db2777); padding: 32px; text-align: center; }
    .header img { height: 40px; }
    .header h2 { color: #fff; margin: 8px 0 0; font-size: 20px; font-weight: 600; }
    .body { padding: 40px 32px; color: #1e293b; line-height: 1.6; }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #0f172a; }
    .info-box { background: #f8fafc; border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
    .info-box p { margin: 6px 0; font-size: 15px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #e11d48, #db2777); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; }
    .footer { padding: 24px 32px; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #f1f5f9; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🏠 Милый Дом</h2>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Милый Дом. Все права защищены.<br>
      <small>Вы получили это письмо, так как зарегистрированы на платформе.</small>
    </div>
  </div>
</body>
</html>`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
