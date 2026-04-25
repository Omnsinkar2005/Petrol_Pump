function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function buildDeadlineSmsMessages(record, details) {
  const outstanding = Number(record.amount) - Number(record.paid_amount || 0);
  const dueLabel = details.daysUntilDeadline === 0 ? 'today' : 'tomorrow';

  return {
    owner: `Petrol Pump alert: ${record.borrower_name} has Rs.${formatMoney(
      outstanding
    )} due ${dueLabel} on ${record.deadline}. Borrower phone: ${record.borrower_phone_number}.`,
    borrower: `Reminder from Petrol Pump: Rs.${formatMoney(
      outstanding
    )} is due ${dueLabel} on ${record.deadline}. Please clear the borrowed petrol amount before the deadline.`,
  };
}

module.exports = { buildDeadlineSmsMessages };
