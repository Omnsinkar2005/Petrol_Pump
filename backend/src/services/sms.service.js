const https = require('https');
const querystring = require('querystring');

function cleanPhone(value) {
  return String(value || '').trim();
}

function normalizeRecipients(value) {
  return String(value || '')
    .split(',')
    .map((part) => cleanPhone(part))
    .filter(Boolean);
}

function getOwnerPhones() {
  return normalizeRecipients(process.env.OWNER_SMS_PHONE);
}

function hasSmsConfig() {
  return (
    process.env.SMS_PROVIDER === 'twilio' &&
    cleanPhone(process.env.TWILIO_ACCOUNT_SID) &&
    cleanPhone(process.env.TWILIO_AUTH_TOKEN) &&
    cleanPhone(process.env.TWILIO_PHONE_NUMBER)
  );
}

function sendTwilioSms(to, body) {
  const accountSid = cleanPhone(process.env.TWILIO_ACCOUNT_SID);
  const authToken = cleanPhone(process.env.TWILIO_AUTH_TOKEN);
  const from = cleanPhone(process.env.TWILIO_PHONE_NUMBER);

  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({ To: to, From: from, Body: body });

    const req = https.request(
      {
        hostname: 'api.twilio.com',
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (ok) {
            try {
              resolve(JSON.parse(raw));
            } catch {
              resolve({ sid: null });
            }
            return;
          }

          let message = `Twilio request failed with status ${res.statusCode}`;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.message) message = parsed.message;
          } catch {
            /* ignore parse errors */
          }
          reject(new Error(message));
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function sendSms(to, body) {
  if (!cleanPhone(to)) {
    throw Object.assign(new Error('SMS recipient phone is required'), { status: 400 });
  }
  if (!body || !String(body).trim()) {
    throw Object.assign(new Error('SMS body is required'), { status: 400 });
  }
  if (!hasSmsConfig()) {
    throw Object.assign(
      new Error('SMS is not configured. Set SMS_PROVIDER and Twilio credentials in backend/.env'),
      { status: 500 }
    );
  }

  if (process.env.SMS_PROVIDER === 'twilio') {
    return sendTwilioSms(to, body);
  }

  throw Object.assign(new Error(`Unsupported SMS provider: ${process.env.SMS_PROVIDER}`), {
    status: 500,
  });
}

module.exports = {
  cleanPhone,
  getOwnerPhones,
  hasSmsConfig,
  sendSms,
};
