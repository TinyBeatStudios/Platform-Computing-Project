$(document).ready(function() {
    // Check if already logged in
    $.ajax({
        url: '/auth/me',
        method: 'GET',
        success: function() {
            // If the request succeeds, the user is already logged in
            window.location.href = 'index.html';
        }
    });
    
    // Handles Login
    $('#login-btn').on('click', function() {
        clearError();
        clearFieldErrors();

        const email    = $('#email').val().trim();
        const password = $('#password').val();

        // Client-side validation 
        if (!email) {
            showError('You need an email silly!');
            setFieldError('email');
            $('#email').focus();
            return;
        }
        if (!isValidEmail(email)) {
            showError('Thats not how you write an email!');
            setFieldError('email');
            $('#email').focus();
            return;
        }
        if (!password) {
            showError('Dont you have a password?');
            setFieldError('password');
            $('#password').focus();
            return;
        }

        setLoading(true);

        $.ajax({
            url: '/auth/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, password: password }),
            
            success: function(user) {
                sessionStorage.setItem('libraryUser', JSON.stringify(user));
                window.location.href = 'index.html';
            },

            error: function(xhr) {
                setLoading(false);

                const message = xhr.responseJSON
                    ? xhr.responseJSON.error
                    : 'Login failed. Please try again.';
                showError(message);

                setFieldError('email');
                setFieldError('password');
                $('#password').val('');
                $('#email').focus();
            }
        });
    });

    // Allow pressing Enter to submit from either field
    $('#email, #password').on('keydown', function(e) {
        if (e.key === 'Enter') $('#login-btn').click();
    });

});

// --- Helper functions ---

function showError(message) {
    $('#error-box').html(message).removeClass('hidden');
}

function clearError() {
    $('#error-box').addClass('hidden').empty();
}

function setFieldError(inputId) {
    $('#' + inputId).addClass('field-error');
}

function clearFieldErrors() {
    $('.form-input').removeClass('field-error');
}

function setLoading(isLoading) {
    if (isLoading) {
        $('#login-btn').text('Signing in...').prop('disabled', true);
    } else {
        $('#login-btn').text('Sign In').prop('disabled', false);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}