document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: 'no-store' });
      const activities = await response.json();

      // Clear loading message and reset select to avoid duplicates
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="" disabled selected>Select activity</option>';

      // Small helper to escape HTML in names/emails
      function escapeHtml(str) {
        return String(str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section (bulleted list, or a friendly message if none)
        const participants = details.participants || [];
        const participantsHTML = participants.length
          ? `<ul class="participants-list">${participants
              .map(
                (p) => `
                <li class="participant-item">
                  <span class="participant-email">${escapeHtml(p)}</span>
                  <button class="remove-participant" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(
                  p
                )}" title="Remove participant">✕</button>
                </li>`
              )
              .join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participant remove buttons within this card
        activityCard.querySelectorAll('.remove-participant').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const activityName = btn.dataset.activity;
            const email = btn.dataset.email;
            if (!confirm(`Unregister ${email} from ${activityName}?`)) return;
            btn.disabled = true;
            try {
              const resp = await fetch(
                `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );
              const resJson = await resp.json();
              if (resp.ok) {
                messageDiv.textContent = resJson.message;
                messageDiv.className = 'success';
                // Refresh list
                await fetchActivities();
              } else {
                messageDiv.textContent = resJson.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                btn.disabled = false;
              }
              messageDiv.classList.remove('hidden');
              setTimeout(() => messageDiv.classList.add('hidden'), 5000);
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant. Try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
              btn.disabled = false;
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so participants list updates immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
