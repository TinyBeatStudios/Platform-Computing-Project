// Current Books Array
let books = [];
let seachTerm = '';

$(document).ready(function() {

    //Handle Seach bar input
    $('#search-input').on('input', function() {
        seachTerm = $(this).val().trim();
        sortAndRender();
    });

    // Handle Opening/Closing Add-Book Modal
    $('#add-book-btn').on('click', function(){
        $('#add-book-modal').data('mode', 'add');
        $('#add-book-modal').data('editing-id', null);
        $('#modal-title').text('Add New Book');
        $('#modal-submit-btn').text('Add Book');
        $('#add-book-form')[0].reset();    // clear any leftover values
        $('#add-book-modal').removeClass('hidden');
    });

    $('#modal-cancel-btn').on('click', function(){
        $('#add-book-modal').addClass('hidden');
    });

    $('#modal-overlay').on('click', function(){
        $('#add-book-modal').addClass('hidden');
    });

    $(document).on('keydown', function(event) {
        if (event.key === 'Escape') {
            $('#add-book-modal').addClass('hidden');
            closeViewPanel();  //also closes view panel
        }
    });

    // Handle closing book view panel
    $('#close-view-panel').on('click', closeViewPanel);
    $('#view-overlay').on('click', closeViewPanel);

    // Handle adding/editing book cards on the grid
    $('#add-book-form').on('submit', function(event) {
        event.preventDefault();    // stop page reload

        // toogle "add book" tooltip
        if (!$('#tooltip').hasClass('hidden')) {
            $('#tooltip').addClass('hidden');
        }

        const mode = $('#add-book-modal').data('mode');

        // Read each input value
        const bookData = {
            title: $('#book-title').val(),
            author: $('#book-author').val(),
            genre: $('#book-genre').val(),
            status: $('#book-status').val(),
            pages: $('#book-pages').val(),
            notes: $('#book-notes').val()
        };

        //Validate form
        if (!validate(bookData)) {
            return;
        }

        if (mode === 'add') {
        bookData.id = Date.now();
        books.push(bookData);
        $('#book-grid').append(generateCard(bookData));

        } else if (mode === 'edit') {
        const editingId = $('#add-book-modal').data('editing-id');
        bookData.id = editingId;    // keep the original id
        
        // Find and replace the book in your array
        const index = books.findIndex(function(b) { return b.id === editingId; });
        books[index] = bookData;
        
        // Find the existing card in the DOM and replace its HTML
        $('article[data-id="' + editingId + '"]').replaceWith(generateCard(bookData));
        // replaceWith() swaps an element with new content entirely.
        // The selector uses an attribute selector — the same syntax as CSS.
        }

        // Reset the form fields and close
        $('#add-book-form')[0].reset();
        $('#add-book-modal').addClass('hidden');
    });
    
    //Handle Opening book view panel
    $('#book-grid').on('click', '.btn-view', function() {
        const bookId = $(this).closest('article').data('id');
        const book = books.find(function(b) { return b.id === bookId; });

        openViewPanel(book);
    });

    // Edit button on cards
    $('#book-grid').on('click', '.btn-edit', function() {
        const bookId = $(this).closest('article').data('id');
        const book = books.find(function(b) { return b.id === bookId; });
        openEditModal(book);
    });

    // Edit button inside the detail panel
    $('#view-edit-btn').on('click', function() {
        const bookId = $('#book-view-panel').data('current-book-id');
        const book = books.find(function(b) { return b.id === bookId; });
        openEditModal(book);
    });

    // Delete button inside the detail panel
    $('#view-delete-btn').on('click', function() {
        const bookId = $('#book-view-panel').data('current-book-id');
        books = books.filter(function(b) { return b.id !== bookId; });
        $('article[data-id="' + bookId + '"]').remove();
        
        if (books.length == 0) {
            $('#tooltip').removeClass('hidden');
        }

        closeViewPanel();
    });
    
    //Handles deleting a book card form grid
    $('#book-grid').on('click', '.btn-delete', function() {
        const card = $(this).closest('article');
        const bookId = card.data('id');

        // Remove from your books array
        books = books.filter(function(book) {
            return book.id !== bookId;
        });
        
        //Toggle tooltip if no books remain
        if (books.length == 0) {
            $('#tooltip').removeClass('hidden');
        }

        //remove card from grid
        card.remove();
    });

    //Handles sorting book cards
    $('#sort-select').on('change', function() {
        sortAndRender();
    });

    //Prevents typing letters for inputting book pages    
    $('.numbers-only').on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

});

// -- Main Functions --
function sortAndRender() {
    const sortValue = $('#sort-select').val();
    let booksToShow = books;

    if (booksToShow.length === 0) {
        return;
    }

    if (seachTerm != '') {
        const term = seachTerm.toLowerCase();

        booksToShow = booksToShow.filter(function(book) {
            return book.title.toLowerCase().includes(term)
                || book.author.toLowerCase().includes(term)
                || book.genre.toLowerCase().includes(term);
        });
    }

    booksToShow.sort(function(a, b) {
        switch(sortValue) {
            case 'title-asc':
                return a.title.localeCompare(b.title);
            case 'title-desc':
                return b.title.localeCompare(a.title);
            case 'author-asc':
                return a.author.localeCompare(b.author);
            case 'genre-asc':
                return a.genre.localeCompare(b.genre);
            case 'pages-asc':
                return (a.pages) - (b.pages);
            case 'pages-desc':
                return (b.pages) - (a.pages);
            case 'date-asc':
                return a.id - b.id;
            case 'date-desc':
            default:
                return b.id - a.id;
        }
    });

    $('#book-grid').empty();

    books.forEach(book => {
        $('#book-grid').append(generateCard(book));
    });
}
// Genreate Book Cards
function generateCard(book) {
    // Determine badge color based on status
    let badgeClasses = '';
    if (book.status === 'Read') {
        badgeClasses = 'bg-[#5C9E74] text-white';
    } else if (book.status === 'In-Progress') {
        badgeClasses = 'bg-[#FFB090] text-[#2D1040]';
    } else {
        badgeClasses = 'bg-[#FFF1D3] text-[#9E8FA0] border border-[#9E8FA0]';
    }

    // Return full card HTML as a template literal string
    // The book's id is stored in data-id
    return `
        <article class="bg-white shadow-md hover:-translate-y-1 hover:shadow-lg transition-transform" data-id="${book.id}">
            <div class="m-2 h-48 bg-[#FFB090] rounded-t-lg overflow-hidden"></div>
            <div class="p-2 bg-white">
                <h2 class="text-[#5D1C6A] font-bold">${book.title}</h2>
                <p class="text-[#2D1040]">Author: ${book.author}</p>
                <p class="text-[#9E8FA0] text-sm mt-1">Genre: ${book.genre}</p>
                <div class="mt-3">
                    <button class="btn-view cursor-pointer text-[#CA5995]">View</button>
                    <button class="btn-edit cursor-pointer">Edit</button>
                    <button class="btn-delete cursor-pointer text-[#C94040]">Delete</button>
                    <span class="rounded-full px-2 py-0.5 mt-6 text-sm font-medium ${badgeClasses}}">${book.status}</span>
                </div>
            </div>
        </article>
    `;
}

//Open book view overlay
function openViewPanel(book) {
    $('#view-title').text(book.title);
    $('#view-author').text(book.author);
    $('#view-genre').text(book.genre);
    $('#view-pages').text(book.pages + ' pages');
    $('#view-notes').text(book.notes || 'No notes added yet.');

    // Format the date from id
    const date = new Date(book.id);
    
    $('#view-date').text(date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    }));

    // Set the status badge
    const badge = $('#view-status-badge');
    badge.text(book.status);
    badge.removeClass('bg-[#5C9E74] bg-[#FFB090] bg-[#FFF1D3] text-white text-[#2D1040] text-[#9E8FA0]');
    
    if (book.status === 'Read') {
        badge.addClass('bg-[#5C9E74] text-white');
    } else if (book.status === 'In-Progress') {
        badge.addClass('bg-[#FFB090] text-[#2D1040]');
    } else {
        badge.addClass('bg-[#FFF1D3] text-[#9E8FA0] border border-[#9E8FA0]');
    }

    // Store the book's id on the panel so the Edit button can access it
    $('#book-view-panel').data('current-book-id', book.id);

    // Show the panel and overlay
    $('#book-view-panel').removeClass('hidden');
    $('#view-overlay').removeClass('hidden');
    
    // Prevent the main page from scrolling while panel is open
    $('body').addClass('overflow-hidden');
}

// Close View Panel
function closeViewPanel() {
    $('#book-view-panel').addClass('hidden');
    $('#view-overlay').addClass('hidden');
    $('body').removeClass('overflow-hidden');
}

// Open Edit Modal
function openEditModal(book) {
    $('#add-book-modal').data('mode', 'edit');
    $('#add-book-modal').data('editing-id', book.id);
    $('#modal-title').text('Edit Book');
    $('#modal-submit-btn').text('Save Changes');
    
    // Pre-fill every field with the book's current values
    $('#book-title').val(book.title);
    $('#book-author').val(book.author);
    $('#book-genre').val(book.genre);
    $('#book-pages').val(book.pages);
    $('#book-status').val(book.status);
    $('#book-notes').val(book.notes);
    
    closeViewPanel();    // close the detail panel if it was open
    $('#add-book-modal').removeClass('hidden');
}

// Validation Function for Book Cards
function validate(book) {
    let status = true;
    let alertText = "";

    if (book.title.length < 1) {
        alertText += "Every book needs a Title!\n";
        status = false;
    } 

    if (book.author.length < 1) {
        alertText += "Every book was written by an Author!\n";
        status = false;
    } 

    if (book.genre == " ") {
        alertText += "What Genre is this book?\n";
        status = false;
    } 

    if (book.status == " ") {
        alertText += "What's the Status of this book? Have you read it?\n";
        status = false;
    } 

    if (book.pages == " ") {
        alertText += "Wouldn't be a book without pages now would it?\n";
        status = false;
    } 

    if (alertText.length > 0) {
        alert(alertText);
    }

    return status;
}

// Helper Functions