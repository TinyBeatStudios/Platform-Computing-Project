// Current Books Array
let books = [];
loadBooks();

let searchTerm = '';
let currCollection = 'collection';
let searchTimeout = null;

sortAndRender();

// Ready Function
$(document).ready(function() {

    //Handle Search bar input, delayed book search
    $('#search-input').on('input', function() {
        clearTimeout(searchTimeout);

        value = $(this).val().trim().toLowerCase();

        searchTimeout = setTimeout(function() {
            searchTerm = value;
            sortAndRender();
        }, 300);
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

        const mode = $('#add-book-modal').data('mode');

        // Read each input value
        const bookData = {
            title: $('#book-title').val(),
            author: $('#book-author').val(),
            genre: $('#book-genre').val(),
            status: $('#book-status').val(),
            wishlist: false,
            pages: $('#book-pages').val(),
            notes: $('#book-notes').val()
        };

        if (!validate(bookData)) {
            return;
        }

        if (mode === 'add') {
        // Send the new book to Express to be saved
        $.ajax({
            url: '/books',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(bookData),
            success: function(savedBook) {
                // savedBook is what Express sent back: book with its ID assigned
                books.push(savedBook);
                
                const card = $(generateCard(savedBook));
                card.css('opacity', '0');
                //Book card invisible for the fade-in animation
                $('#book-grid').append(card);
                setTimeout(function() {
                    card.css('transition', 'opacity 0.4s ease');
                    card.css('opacity', '1');
                }, 10);
                
                sortAndRender();

                showToast('Book added! :D', 'success');
                $('#add-book-form')[0].reset();
                $('#add-book-modal').addClass('hidden');
            },
            error: function() {
                showToast('Failed to save book. Is the server running?', 'error');
            }
        });
        return;

        } else if (mode === 'edit') {
            const editingId = $('#add-book-modal').data('editing-id');
            bookData.id = editingId;
            
            $.ajax({
                url: '/books/' + editingId,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(bookData),
                success: function(updatedBook) {
                    const index = books.findIndex(function(b) { return b.id === editingId; });
                    books[index] = updatedBook;
                    
                    const newCard = $(generateCard(updatedBook));
                    $('article[data-id="' + editingId + '"]').replaceWith(newCard);
                    
                    showToast('Changes saved! B)', 'info');
                    $('#add-book-form')[0].reset();
                    $('#add-book-modal').addClass('hidden');
                },
                error: function() {
                    showToast('Failed to save changes.', 'error');
                }
            });
            return;
        }
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
    
        $.ajax({
            url: '/books/' + bookId,
            method: 'DELETE',
            success: function() {
                books = books.filter(function(b) { return b.id !== bookId; });
                const card = $('article[data-id="' + bookId + '"]');
                
                card.css('transition', 'opacity 0.3s ease, transform 0.3s ease');
                card.css('opacity', '0');
                card.css('transform', 'scale(0.95)');
                setTimeout(function() {
                    card.remove();
                    sortAndRender();
                }, 300);
                
                closeViewPanel();
                showToast('Book deleted D:', 'error');
            },
            error: function() {
                showToast('Failed to delete book.', 'error');
            }
        });
    });
    
    //Handles deleting a book card form grid
    $('#book-grid').on('click', '.btn-delete', function() {
        const card = $(this).closest('article');
        const bookId = card.data('id');
    
        $.ajax({
            url: '/books/' + bookId,
            method: 'DELETE',
            success: function() {
                books = books.filter(function(b) { return b.id !== bookId; });
                
                // Animate the card out before removing it
                card.css('transition', 'opacity 0.3s ease, transform 0.3s ease');
                card.css('opacity', '0');
                card.css('transform', 'scale(0.95)');
                setTimeout(function() {
                    card.remove();
                    sortAndRender();
                }, 300);
                // Wait for the animation to finish, then remove
                
                showToast('Book deleted D:', 'error');
            },
            error: function() {
                showToast('Failed to delete book.', 'error');
            }
        });
    });

    // Handle API book search button click
    $('#book-search-btn').on('click', function() {
        runBookSearch();
    });

    // Allow pressing Enter in the search box to trigger search
    $('#book-search-input').on('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            // Prevent Enter from submitting the add-book-form accidentally
            runBookSearch();
        }
    });

    // When a search result is clicked, auto-fill the form
    $('#book-search-results').on('click', '.book-search-result', function() {
        $('#book-title').val($(this).data('title'));
        $('#book-author').val($(this).data('author'));
        $('#book-notes').val($(this).data('description'));
        
        // Attempt to match genre from Google API
        const apiGenre = $(this).data('genre');
        if (apiGenre && $('#book-genre option[value="' + apiGenre + '"]').length > 0) {
            $('#book-genre').val(apiGenre);
        }
        
        const pages = $(this).data('pages');
        if (pages) {
            $('#book-pages').val(pages);
        }
        
        // Hide results and clear search input
        $('#book-search-results').addClass('hidden').empty();
        $('#book-search-input').val('');
        
        $('#book-title').focus();
        showToast('Details filled in! ;D', 'info');
    });

    // Handles Tab switching
    $('#tab-collection').on('click', function() {
        currCollection = 'collection';
        $(this).addClass('bg-[#5D1C6A] text-[#FFF1D3]');
        $(this).removeClass('text-[#5D1C6A]');
        $('#tab-wishlist').removeClass('bg-[#5D1C6A] text-[#FFF1D3]')
        $('#tab-wishlist').addClass('text-[#5D1C6A]');
        sortAndRender();
    });

    $('#tab-wishlist').on('click', function() {
        currCollection = 'wishlist';
        $(this).addClass('bg-[#5D1C6A] text-[#FFF1D3]');
        $(this).removeClass('text-[#5D1C6A]');
        $('#tab-collection').removeClass('bg-[#5D1C6A] text-[#FFF1D3]');
        $('#tab-collection').addClass('text-[#5D1C6A]');
        sortAndRender();
    });

    // Handle Wishlist toggle button on cards
    $('#book-grid').on('click', '.btn-wishlist', function(event) {
        event.stopPropagation();
        
        const card = $(this).closest('article');
        const bookId = card.data('id');
        const book = books.find(function(b) { return b.id === bookId; });
        
        book.wishlist = !book.wishlist;
        
        // Update the button icon
        $(this).text(book.wishlist ? '★' : '☆');
        $(this).attr('title', book.wishlist ? 'Remove from wishlist' : 'Add to wishlist');
        
        // Animate the button
        $(this).css('transform', 'scale(1.4)');
        setTimeout(function() {
            $(this).css('transform', '');
        }.bind(this), 200);
        
        // Save to server
        $.ajax({
            url: '/books/' + bookId,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(book),
            success: function() {
                const msg = book.wishlist ? 'Added to wishlist! :O' : 'Removed from wishlist O:';
                showToast(msg, 'info');
                
                sortAndRender();
            }
        });
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

// -- Primary Functions --
function sortAndRender() {
    const sortValue = $('#sort-select').val();
    let booksToShow = books;

    if (currCollection === 'wishlist') {
        booksToShow = booksToShow.filter(function(book) { return book.wishlist === true; });
    } else {
        booksToShow = booksToShow.filter(function(book) { return book.wishlist === false; });
    }

    if (booksToShow.length == 0) {
        $('#book-grid').contents().not('#tooltip').remove();
        
        if ($('#tooltip').hasClass('hidden')) {
            $('#tooltip').removeClass('hidden');
        }
        
        if (currCollection === "wishlist") {
            $('#tooltip').text('Add Books to your Wishlist to see them here!');
        } else {
            $('#tooltip').text('Add Books to your Collection to see them here!');
        }
        
        return;
    } else {
        if (!$('#tooltip').hasClass('hidden')) {
            $('#tooltip').addClass('hidden');
        }
    }

    if (searchTerm != '') {
        const term = searchTerm;

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

    $('#book-grid').contents().not('#tooltip').remove();

    booksToShow.forEach(book => {
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

    // Return full card HTML
    return `
        <article class="bg-white shadow-md hover:-translate-y-1 hover:shadow-lg transition-transform" data-id="${book.id}" data-wishlist="${book.wishlist ? 'true' : 'false'}">
            <div class="m-2 h-48 bg-[#FFB090] rounded-t-lg overflow-hidden"></div>
            <div class="p-2 bg-white">
                <h2 class="text-[#5D1C6A] font-bold">${book.title}</h2>
                <p class="text-[#2D1040]">Author: ${book.author}</p>
                <p class="text-[#9E8FA0] text-sm mt-1">Genre: ${book.genre}</p>
                <div class="mt-3">
                    <button class="btn-view cursor-pointer text-[#CA5995] text-sm hover:underline">View</button>
                    <button class="btn-edit cursor-pointer text-sm hover:underline">Edit</button>
                    <button class="btn-delete cursor-pointer text-[#C94040] text-sm hover:underline">Delete</button>
                    <button class="btn-wishlist cursor-pointer text-lg ml-auto transition-transform hover:scale-125" title="${book.wishlist ? 'Remove from wishlist' : 'Add to wishlist'}">${book.wishlist ? '★' : '☆'}</button>
                    <span class="rounded-full px-2 py-0.5 mt-6 text-sm font-medium ${badgeClasses}">${book.status}</span>
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
    
    // close the detail panel if it was open
    closeViewPanel();    
    $('#add-book-modal').removeClass('hidden');
}

// Toaster Notif handler
function showToast(message, type) {

    const colors = {
        success: 'bg-[#5C9E74] text-white',
        error: 'bg-[#C94040] text-white',
        info: 'bg-[#5D1C6A] text-white'
    };

    const toast = $(`
        <div class="toast ${colors[type] || colors.info} px-5 py-3 rounded-xl shadow-lg text-sm font-medium opacity-0 transition-opacity duration-300">
            ${message}
        </div>
    `);

    $('#toast-container').append(toast);
    
    // Fade in
    setTimeout(function() {
        toast.css('opacity', '1');
    }, 10);

    // Fade out and remove after 3 seconds
    setTimeout(function() {
        toast.css('opacity', '0');
        setTimeout(function() {
            toast.remove();
        }, 300);
        // Wait for the fade-out transition to finish before removing
    }, 3000);
}

function runBookSearch() {
    const query = $('#book-search-input').val().trim();
    if (query === '') return;
    
    // disables search button
    $('#book-search-btn').text('Searching...').prop('disabled', true);
    
    
    $('#book-search-results')
        .removeClass('hidden')
        .html('<p class="p-3 text-[#9E8FA0] text-sm text-center">Searching Google Books...</p>');

    $.ajax({
        url: 'https://www.googleapis.com/books/v1/volumes',
        method: 'GET',
        data: {
            q: query,
            maxResults: 8,
            printType: 'books'
            // URL query parameters: ?q=Dune&maxResults=8&printType=books
        },
        success: function(response) {
            $('#book-search-btn').text('Search').prop('disabled', false);

            if (!response.items || response.items.length === 0) {
                $('#book-search-results').html('<p class="p-3 text-[#9E8FA0] text-sm text-center">No books found.</p>');
                return;
            }

            let html = '';

            response.items.forEach(function(item) {
                const info = item.volumeInfo;
                
                const title = info.title || 'Unknown Title';
                
                // Turn author array into a string
                const authors = info.authors ? info.authors.join(', ') : 'Unknown Author';
                
                
                const genre = info.categories ? info.categories[0] : '';
                
                const pages = info.pageCount || '';
                const thumbnail = info.imageLinks ? info.imageLinks.smallThumbnail : '';
                const year = info.publishedDate ? info.publishedDate.substring(0, 4) : '';

                const description = info.description ? info.description.substring(0, 300) : '';

                // .replace(/"/g, '&quot;') replaces any quotation marks to prevent html errors
                html += `
                    <div class="book-search-result flex items-center gap-3 p-3 
                                hover:bg-[#FFF1D3] cursor-pointer border-b border-gray-100 last:border-0"
                        data-title="${title.replace(/"/g, '&quot;')}"
                        data-author="${authors.replace(/"/g, '&quot;')}"
                        data-genre="${genre}"
                        data-pages="${pages}"
                        data-description="${description.replace(/"/g, '&quot;')}">
                        
                        ${thumbnail 
                            ? `<img src="${thumbnail}" class="w-10 h-14 object-cover rounded flex-shrink-0 shadow-sm">` 
                            : `<div class="w-10 h-14 bg-[#FFB090] rounded flex-shrink-0 opacity-60"></div>`
                        }
                        
                        <div class="min-w-0">
                            <p class="text-[#2D1040] text-sm font-semibold truncate">${title}</p>
                            <p class="text-[#9E8FA0] text-xs">${authors}${year ? ' · ' + year : ''}</p>
                            ${pages ? `<p class="text-[#9E8FA0] text-xs">${pages} pages</p>` : ''}
                        </div>
                    </div>
                `;
                
            });

            $('#book-search-results').html(html);
        },
        error: function(xhr) {
            $('#book-search-btn').text('Search').prop('disabled', false);
            
            let message = 'Search failed.';
            if (xhr.status === 429) {
                message = 'Too many searches — wait a moment and try again.';
            } else if (xhr.status === 0) {
                message = 'Cannot reach Google Books. Check your connection.';
            } else {
                message = 'Error ' + xhr.status + '. Try again.';
            }
            
            $('#book-search-results').html('<p class="p-3 text-[#C94040] text-sm">' + message + '</p>');
        }
    });
}

// Helper Functions

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
        showToast(alertText, 'error');
    }

    return status;
}

//Load existing books from server
function loadBooks() {
    $.ajax({
        url: '/books',
        method: 'GET',
        success: function(serverBooks) {
            // serverBooks is the array Express sent back from books.json
            books = serverBooks;
            
            if (books.length === 0) {
                return;
            }
            
            // Hide the tooltip and render all loaded books
            $('#tooltip').addClass('hidden');
            books.forEach(function(book) {
                $('#book-grid').append(generateCard(book));
            });
        },
        error: function(xhr) {
            showToast('Could not load your books. Is the server running?', 'error');
        }
    });
}