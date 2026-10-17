/**
 * OTP Terminal Display Logger
 * Formats and prints generated OTPs (SMS and Email) to the server terminal
 * with high visibility, clear layout, and prominent visual cues.
 */

const logOtpToTerminal = ({
  channel = "SMS", // "SMS" | "EMAIL"
  recipient = "",
  otp = "",
  purpose = "login",
  role = null,
  expiresInMinutes = 10,
}) => {
  const isEmail = String(channel).toUpperCase() === "EMAIL";
  const icon = isEmail ? "📧" : "📱";
  const channelType = isEmail ? "EMAIL (OTP)" : "SMS / PHONE (OTP)";

  // Standard ANSI color codes for terminal highlighting
  const cyan = "\x1b[36m";
  const brightYellow = "\x1b[93m";
  const brightGreen = "\x1b[92m";
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";

  const divider = "============================================================";
  const timestamp = new Date().toLocaleTimeString();

  console.log(`\n${cyan}${divider}${reset}`);
  console.log(`${icon}  ${bold}${brightGreen}[ELDORIA OTP GENERATED]${reset} ${cyan}• ${timestamp}${reset}`);
  console.log(`${cyan}${divider}${reset}`);
  console.log(`   Type / Channel : ${bold}${channelType}${reset}`);
  console.log(`   Recipient      : ${bold}${recipient}${reset}`);
  console.log(`   OTP Code       : ${brightYellow}${bold}>>> ${otp} <<<${reset}`);
  console.log(`   Purpose        : ${String(purpose).toUpperCase()}`);
  if (role) {
    console.log(`   Role / Portal  : ${String(role).toUpperCase()}`);
  }
  console.log(`   Valid For      : ${expiresInMinutes} minutes`);
  console.log(`${cyan}${divider}${reset}\n`);
};

module.exports = {
  logOtpToTerminal,
};
