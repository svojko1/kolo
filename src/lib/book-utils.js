function fetchBookDetails(isbn) {
    // Open Library API endpoint to fetch book details by ISBN
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Open Library returns the book data under the ISBN key
            const bookData = data[`ISBN:${isbn}`];
            if (bookData) {
                displayBookInfo(bookData);
            } else {
                alert('No book found with this ISBN.');
                // Restart the scanner to allow scanning again
                startScanner();
            }
        })
        .catch(error => {
            console.error('Error fetching book details:', error);
            alert('An error occurred while fetching book details. Check console for details.');
            // Restart the scanner
            startScanner();
        });
}

function displayBookInfo(book) {
    const bookInfoDiv = document.getElementById('book-info');

    // Extracting information from Open Library's response
    const title = book.title || 'No title available';
    const authors = book.authors ? book.authors.map(author => author.name).join(', ') : 'Unknown Author';
    const publishedDate = book.publish_date || 'No published date available';
    const description = book.description ?
        (typeof book.description === 'string' ? book.description : book.description.value) :
        'No description available';

    // Display book information in the HTML
    bookInfoDiv.innerHTML = `
        <h2>${title}</h2>
        <p><strong>Authors:</strong> ${authors}</p>
        <p><strong>Published Date:</strong> ${publishedDate}</p>
        <p><strong>Description:</strong> ${description}</p>
        <button id="scan-again">Scan Another ISBN</button>
    `;

    // Add a button click event to restart the scanner
    document.getElementById('scan-again').addEventListener('click', function() {
        bookInfoDiv.innerHTML = '';
        startScanner();
    });
}