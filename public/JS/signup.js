$(document).ready(function() {
    // Redirect if already logged in
    $.ajax({
        url: '/auth/me',
        method: 'GET',
        success: function() {
            window.location.href = 'index.html';
        }
    });

    // Password strength meter
    $('#password').on('input', function() {
        const pw = $(this).val();
        let score = 0;

        if (pw.length >= 8)              score++;
        if (/[A-Z]/.test(pw))            score++;
        if (/[0-9]/.test(pw))            score++;
        if (/[^A-Za-z0-9]/.test(pw))     score++;

        const widths = ['0%', '25%', '50%', '75%', '100%'];
        const colors = ['', '#C94040', '#FFB090', '#CA5995', '#5C9E74'];
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const labelColors = ['', '#C94040', '#9E8FA0', '#CA5995', '#5C9E74'];

        $('#strength-bar').css({
            width: widths[score],
            backgroundColor: colors[score]
        });
        $('#strength-label')
            .text(pw.length > 0 ? labels[score] : '')
            .css('color', labelColors[score]);
    });

    // password match indicator
    $('#confirm-password').on('input', function() {
        const pw      = $('#password').val();
        const confirm = $(this).val();

        if (confirm.length === 0) {
            $('#match-label').text('');
            return;
        }
        if (pw === confirm) {
            $('#match-label').text('Passwords match ✓').css('color', '#5C9E74');
            $(this).removeClass('field-error');
        } else {
            $('#match-label').text('Passwords do not match').css('color', '#C94040');
        }
    });

    // --- Signup handler ---
    $('#signup-btn').on('click', function() {
        clearError();
        clearFieldErrors();
        $('#match-label').text('');

        const name     = $('#name').val().trim();
        const email    = $('#email').val().trim();
        const password = $('#password').val();
        const confirm  = $('#confirm-password').val();

        // Validate each field in order
        if (!name) {
            showError('Please enter your name.');
            setFieldError('name');
            $('#name').focus();
            return;
        }
        if (!email || !isValidEmail(email)) {
            showError('Please enter a valid email address.');
            setFieldError('email');
            $('#email').focus();
            return;
        }
        if (password.length < 8) {
            showError('Password must be at least 8 characters long.');
            setFieldError('password');
            $('#password').focus();
            return;
        }
        if (password !== confirm) {
            showError('Passwords do not match.');
            setFieldError('confirm-password');
            $('#confirm-password').focus();
            return;
        }

        setLoading(true);

        $.ajax({
            url: '/auth/signup',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name, email, password }),

            success: function(user) {
                // Account created and session started on the server.
                // Store user info for the UI.
                sessionStorage.setItem('libraryUser', JSON.stringify(user));
                window.location.href = 'index.html';
            },

            error: function(xhr) {
                setLoading(false);
                const message = xhr.responseJSON
                    ? xhr.responseJSON.error
                    : 'Signup failed. Please try again.';
                showError(message);

                if (message.toLowerCase().includes('email')) {
                    setFieldError('email');
                    $('#email').focus();
                }
            }
        });
    });

    // Enter key on any field submits the form
    $('.form-input').on('keydown', function(e) {
        if (e.key === 'Enter') $('#signup-btn').click();
    });

});

// --- Helpers ---

function showError(msg) {
    $('#error-box').html(msg).removeClass('hidden');
}

function clearError() {
    $('#error-box').addClass('hidden').empty();
}

function setFieldError(id) {
    $('#' + id).addClass('field-error');
}

function clearFieldErrors() {
    $('.form-input').removeClass('field-error');
}

function setLoading(isLoading) {
    if (isLoading) {
        $('#signup-btn').text('Creating account...').prop('disabled', true);
    } else {
        $('#signup-btn').text('Create Account').prop('disabled', false);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}