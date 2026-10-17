document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('enquiryForm');
  const status = document.getElementById('enquiryStatus');
  const button = document.getElementById('enquirySubmitButton');
  if (!form || !status || !button) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    button.textContent = 'Submitting…';
    status.textContent = '';
    try {
      const data = new FormData(form);
      const response = await fetch('/api/enquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.get('name'), email: data.get('email'), phone: data.get('phone'), company: data.get('company'), message: data.get('message') })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not submit your enquiry.');
      status.textContent = 'Thank you. Your enquiry has been submitted successfully. Our team will contact you.';
      status.className = 'enquiry-status is-success';
      form.reset();
    } catch (error) {
      console.error('Enquiry submission error:', error);
      status.textContent = error.message.includes('Failed to fetch') ? 'The enquiry server is not running or is not connected. Please try again later.' : error.message;
      status.className = 'enquiry-status is-warning';
    } finally {
      button.disabled = false;
      button.textContent = 'Submit Enquiry';
    }
  });
});
