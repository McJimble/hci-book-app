import flatpickr from 'flatpickr';
import $ from 'jquery';
import 'jquery';

// This entire file became a huge mess, can't lie. Read at your own risk

interface OpenLibrarySearchResponse {
    numFound: number;
    start: number;
    docs: Object[];
}

interface OpenLibrarySearchElement {
    author_name: string[];
    first_publish_year: number;
    key: string;
    title: string;
    cover_i: number;
}

interface OpenLibraryGenreElement{
    subject: string[];
}

class BookItem {

    // Inherent to all items; whether added or not.
    lib_data: OpenLibrarySearchElement;
    joined_authors: string;
    cover_url: string;
    genres: Set<string>;

    // Populated when displayed, dynamic based on user info
    handleListButton: HTMLElement;
    handleSingleDisplayButton: HTMLElement;
    startedDatepicker: flatpickr.Instance;
    finishedDatepicker: flatpickr.Instance;
    isInList = false;

    startedDate: Date;
    finishedDate: Date;
    synopsis: string;

    // Expects one object from json "docs" array from API. Not the best
    // but should be simple for this case.
    constructor(apiBookElement: OpenLibrarySearchElement) {
        if (apiBookElement == null) {
            const dummyBook: OpenLibrarySearchElement = {
                title: "The Test Book",
                author_name: ["James Robertson"],
                cover_i: 0,
                first_publish_year: 2000,
                key: "test",
            };
            this.lib_data = dummyBook;
            this.joined_authors = "James Robertson";
            this.cover_url = "../img/unknown-cover.png";
        }
        else {
            this.lib_data = apiBookElement;
            
            // Only display 3 authors maximum. Also, truncate duplicates since API is wonky
            // and has duplicate names often.
            this.joined_authors = "Unknown";
            if (this.lib_data.author_name != null) {
                const numAuthors = this.lib_data.author_name.length;
                let truncateAuthors = this.lib_data.author_name.slice(0, Math.min(3, numAuthors));
                let duplicateAuthors = new Set<string>();
                truncateAuthors = truncateAuthors.filter((author) => {
                    if (duplicateAuthors.has(author))
                        return false;
                    duplicateAuthors.add(author);
                    return true;
                });

                this.joined_authors = truncateAuthors.join(', ');
            }

            if (this.lib_data.cover_i != null)
                this.cover_url = `https://covers.openlibrary.org/b/id/${this.lib_data.cover_i}-L.jpg`;
            else
                this.cover_url = `../img/unknown-cover.png`;
            // this.fetchBookGenres().then((subject) => {
            //     console.log(subject);
            // });
        }

        this.genres = new Set<string>();
        this.synopsis = '';
    }

    getTrueWorkID() : string {
        return this.lib_data.key.split('/')[2]
    }

    // Lazy way of doing this but whatever.
    getDateStartedElementID() : string {
        return `datepicker-${this.getTrueWorkID()}-started`;
    }

    getDateFinishedElementID() : string {
        return `datepicker-${this.getTrueWorkID()}-finished`;
    }

    getHandleListButtonElementID() : string {
        return `handle-list-button-${this.getTrueWorkID()}`;
    }
    
    getHandleSingleViewButtonElementID() : string {
        return `handle-single-view-button-${this.getTrueWorkID()}`;
    }

    getUserInfoDivElementID() : string {
        return `user-info-${this.getTrueWorkID()}`;
    }

    getSynopsisDivElementID() : string {
        return `book-info-synopsis-${this.getTrueWorkID()}`;
    }

    getGenresDipslayText() : string {
        return (this.genres.size > 0) ? [...this.genres].join(', ') : 'N/A';
    }

    generateMainHtml() : string {

        const html =    `
                            <div class="book-img-container" id="${this.getHandleSingleViewButtonElementID()}">
                                <img src="${this.cover_url}" onerror="this.onerror=null; this.src='../img/unknown-cover.png'" alt="">
                            </div>
                            <div class="book-info">
                                <div class="book-main-info">
                                    <h2>${this.lib_data.title}</h2>
                                    <span>by ${this.joined_authors}</span>
                                </div>
                                <div class="book-extra-info">
                                    <div class="book-publish-date">
                                        <span>Published: ${this.lib_data.first_publish_year}</span>
                                    </div>
                                    <div class="book-genres">
                                        <span>Genres: ${this.getGenresDipslayText()}</span>
                                    </div>
                                    <div class="book-synopsis">
                                        <span id="${this.getSynopsisDivElementID()}"></span>
                                    </div>
                                </div>
                                <div class="book-user-info" id="${this.getUserInfoDivElementID()}">
                                        <i>Date Started</i>
                                        <input class="filter-datepicker" id="${this.getDateStartedElementID()}" placeholder="Select Date.."/>
                                        <i>Date Finished</i>
                                        <input class="filter-datepicker" id="${this.getDateFinishedElementID()}" placeholder="Select Date.."/>
                                </div>
                            </div>
                        `;
        return html;
    }

    generateAddButtonHtml(isInList : boolean) : string {
        const srcImg = isInList ?  "../img/remove-item.png" : "../img/add-item.png";
        const buttonFunctionTip = isInList ? "Remove from list" : "Add to list";
        const addButtonHtml =   `
                                    <div class="add-book-button" id=${this.getHandleListButtonElementID()}>
                                        <img src="${srcImg}" alt="">
                                        <i>${buttonFunctionTip}</i>
                                    </div>
                                `;
        return addButtonHtml;
    }

    destroyCustomElements() {
                
        // Destroy prior instances if possible.
        if (this.startedDatepicker != null) {
            this.startedDatepicker.set('onChange', null);
            this.startedDatepicker.element.remove();
            this.startedDatepicker.destroy();
        }
        if (this.finishedDatepicker != null) {
            this.finishedDatepicker.set('onChange', null);
            this.finishedDatepicker.element.remove();
            this.finishedDatepicker.destroy();
            this.finishedDatepicker = null;
        }

        if (this.handleListButton != null) {
            this.handleListButton.removeEventListener('click', this.handleListButtonOnClick)
        }

        if (this.handleSingleDisplayButton != null) {
            this.handleSingleDisplayButton.removeEventListener('click', this.handleToggleSingleViewOnClick);
        }
    }

    populateCustomElements(addedBooks : Map<string, BookItem>) {
        this.isInList = addedBooks.has(this.lib_data.key);
        //console.log(addedBooks);
        const today = new Date().toISOString()

        const startDateValid = this.startedDate != null && this.startedDate.toString() !== 'Invalid Date';
        const finishDateValid = this.finishedDate != null && this.finishedDate.toString() !== 'Invalid Date'

        // Set all properties and event listeners to the associated elements
        this.startedDatepicker = flatpickr(`#${this.getDateStartedElementID()}`.toString(), {
            maxDate: (finishDateValid) ? this.finishedDate : today, 
            onChange: (selectedDates, dateStr, instance) => {this.startedDatepickerOnChange(selectedDates);}
        }) as flatpickr.Instance;
        if (startDateValid) {
            this.startedDatepicker.setDate(this.startedDate, true);
        }

        this.startedDatepicker.input.disabled = !this.isInList;

        this.finishedDatepicker = flatpickr(`#${this.getDateFinishedElementID()}`.toString(), {
            maxDate: today, 
            minDate: (startDateValid) ? this.startedDate : null,
            onChange: (selectedDates, dateStr, instance) => {this.finishedDatepickerOnChange(selectedDates);}
        }) as flatpickr.Instance;
        if (finishDateValid) {
            this.finishedDatepicker.setDate(this.finishedDate, true);
        }
        this.finishedDatepicker.input.disabled = !this.isInList;
        
        // Button controlling added/removing from list
        this.handleListButton = document.querySelector(`#${this.getHandleListButtonElementID()}`);
        this.handleListButtonOnClick = this.handleListButtonOnClick.bind(this);
        this.handleListButton.addEventListener('click', this.handleListButtonOnClick);

        // Handles toggleing single-book view.
        this.handleSingleDisplayButton = document.querySelector(`#${this.getHandleSingleViewButtonElementID()}`);
        this.handleToggleSingleViewOnClick = this.handleToggleSingleViewOnClick.bind(this);
        this.handleSingleDisplayButton.addEventListener('click', this.handleToggleSingleViewOnClick);
    
        const userInfoDiv = document.querySelector(`#${this.getUserInfoDivElementID()}`);
        if (!this.isInList) {
            userInfoDiv.classList.add('user-book-info-disabled');
        }
        else {
            userInfoDiv.classList.remove('user-book-info-disabled');
        }
    }

    startedDatepickerOnChange(selectedDates : Date[]) {
        if (selectedDates.length > 0) {
            this.startedDate = new Date(selectedDates[0]);
            this.finishedDatepicker?.set('minDate', selectedDates[0]);
        }
    }

    finishedDatepickerOnChange(selectedDates : Date[]) {
        if (selectedDates.length > 0) {
            this.finishedDate = new Date(selectedDates[0]); // Was having weird issues; prob not necessary to new
            this.startedDatepicker?.set('maxDate', selectedDates[0]);
        }
    }

    handleListButtonOnClick() {
        this.isInList = !this.isInList;

        const userInfoDiv = document.querySelector(`#${this.getUserInfoDivElementID()}`);

        const img = this.handleListButton.querySelector('img');
        const buttonFunctionText = this.handleListButton.querySelector('i');
        if (!this.isInList) {
            img.src = "../img/add-item.png";

            this.finishedDatepicker.input.disabled = true;
            this.startedDatepicker.input.disabled = true;

            userInfoDiv.classList.add('user-book-info-disabled');
            buttonFunctionText.innerText = "Add to list";

            addedBooks.delete(this.lib_data.key);
        }
        else {
            img.src = "../img/remove-item.png";

            this.finishedDatepicker.input.disabled = false;
            this.startedDatepicker.input.disabled = false;

            userInfoDiv.classList.remove('user-book-info-disabled');
            buttonFunctionText.innerText = "Remove from list";


            addedBooks.set(this.lib_data.key, this);
            //console.log(addedBooks);
        }
    }

    async handleToggleSingleViewOnClick() {

        // Fetch synopsis now, if we haven't yet
        if (this.synopsis == '') {
            this.synopsis = await getBookDescription(this.getTrueWorkID());
        }

        document.querySelector(`#${this.getSynopsisDivElementID()}`).textContent = this.synopsis;

        const bookItemParentElement = document.querySelector(`#${this.getTrueWorkID()}`);
        bookItemParentElement.classList.add('single-view-active-book-item');

        setSingleItemView(true);
    }

    isCompletedAfterDate(date : Date) : boolean {
        if (this.finishedDatepicker == null) {
            return false;
        }

        return  this.finishedDatepicker.selectedDates.length > 0 && 
                this.finishedDatepicker.selectedDates[0] >= date;
    }

    isCompletedBeforeDate(date : Date) : boolean {
        if (this.finishedDatepicker == null) {
            return false;
        }

        return  this.finishedDatepicker.selectedDates.length > 0 &&
                this.finishedDatepicker.selectedDates[0] <= date;
    }

    isStartedAfterDate(date : Date) : boolean {
        if (this.startedDatepicker == null) {
            return false;
        }

        return  this.startedDatepicker.selectedDates.length > 0 && 
                this.startedDatepicker.selectedDates[0] >= date
    }

    isStartedBeforeDate(date : Date) : boolean {
        if (this.startedDatepicker == null) {
            return false;
        }

        return  this.startedDatepicker.selectedDates.length > 0 && 
                this.startedDatepicker.selectedDates[0] <= date
    }


    isPublishedAfterDate(date : Date) : boolean {
        if (this.lib_data.first_publish_year == null) {
            return false;
        }

        return this.lib_data.first_publish_year >= date.getFullYear();
    }

    isPublishedBeforeDate(date : Date) : boolean {
        if (this.lib_data.first_publish_year == null) {
            return false;
        }

        return this.lib_data.first_publish_year <= date.getFullYear();
    }

    containsGenre(genre : string) {
        return this.genres.has(genre);
    }
}

async function getBookJsonData(query: string, limit = 20, page = 1) : Promise<OpenLibrarySearchResponse | null> {

    const encoded = encodeURIComponent(query);
    const url = `https://openlibrary.org/search.json?q=${encoded}&limit=${limit}&page=${page}`;
    let response;
    try {
        response = await fetch(url);
    }
    catch{
        return null;
    }
    finally{
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data;
    }
}

async function getSearchQuerySubjectData(query: string, limit = 20, page = 1) : Promise<OpenLibrarySearchResponse | null> {

    const encoded = encodeURIComponent(query);
    const url = `https://openlibrary.org/search.json?q=${encoded}&fields=subject&limit=${limit}&page=${page}`;
    let response;
    try {
        response = await fetch(url);
    }
    catch{
        return null;
    }
    finally{
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data;
    }
}

async function getBookDescription(workId : string) : Promise<string> {
    
    const response = await fetch(`https://openlibrary.org/works/${workId}.json`)
    const data = await response.json();
    let description = "";
    if (typeof data.description === "string") {
        description = data.description;
    } else if (data.description && typeof data.description.value === "string") {
        description = data.description.value;
    }
    return description;
}

function preventInvalidDatepickerInput(input: HTMLInputElement) {
    input?.addEventListener("keydown", (e) => {
        // Prevent Ctrl + A
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
          e.preventDefault();
        }
      
        // Prevent Delete and Backspace
        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
        }
      });
}

let addedBooks = new Map<string, BookItem>();   // Books added by user.
let fetchedBooks: BookItem[] = [];              // Books fetched from API or added books; depends on if on Browse or Home
let unfilteredFetchedBooks: BookItem[] = [];            // Books actually displayed after filter(s) applied.
let searchBarValue = '';

// Various logic for state of elements on page
let listViewActive = true;
let browsingFullDatabase = false;
let isFilterBarOpen = false;
let isSingleItemView = false;
let hasSearchedOnce = false;

let testFp = flatpickr('#test-datepicker', {});
const bookDisplay = document.querySelector("#book-display") as HTMLElement;

// --- All HTMLElements for various filters to apply to searches! ---
const completeCheckbox          = document.querySelector('#complete-checkbox') as HTMLInputElement;
const incompleteCheckbox        = document.querySelector('#incomplete-checkbox') as HTMLInputElement;

const completedBeforeDatepicker = flatpickr('#completed-before-datepicker', {maxDate: new Date(), onChange: filterAndRefreshBooks}) as flatpickr.Instance;
const completedAfterDatepicker  = flatpickr('#completed-after-datepicker',  {maxDate: new Date(), onChange: filterAndRefreshBooks}) as flatpickr.Instance;
const startedBeforeDatepicker   = flatpickr('#started-before-datepicker',   {maxDate: new Date(), onChange: filterAndRefreshBooks}) as flatpickr.Instance;
const startedAfterDatepicker    = flatpickr('#started-after-datepicker',    {maxDate: new Date(), onChange: filterAndRefreshBooks}) as flatpickr.Instance;
const publishedBeforeDatepicker = flatpickr('#published-before-datepicker', {maxDate: new Date(), onChange: filterAndRefreshBooks})  as flatpickr.Instance;
const publishedAfterDatepicker  = flatpickr('#published-after-datepicker',  {maxDate: new Date(), onChange: filterAndRefreshBooks}) as flatpickr.Instance;

// Bandaid solution to some weird shit going on. Calendar divs are not getting destroyed
// for custom book items; having this class prevents their destruction!
completedBeforeDatepicker.calendarContainer.classList.add('persistent-calendar');
completedAfterDatepicker.calendarContainer.classList.add('persistent-calendar');
startedBeforeDatepicker.calendarContainer.classList.add('persistent-calendar');
startedAfterDatepicker.calendarContainer.classList.add('persistent-calendar');
publishedBeforeDatepicker.calendarContainer.classList.add('persistent-calendar');
publishedAfterDatepicker.calendarContainer.classList.add('persistent-calendar');

const genreDropdown             = document.querySelector('#genre-dropdown') as HTMLSelectElement;
const genreOptions = new Map<string, string>();
Array.from(genreDropdown.options).forEach((option) => {
    genreOptions.set(option.value, option.text);
});

// Search bar section elements
const searchInput = document.querySelector("#search-input") as HTMLInputElement;
const searchIcon = document.querySelector("#search-icon") as HTMLElement;
const searchHeader = document.querySelector("#search-header") as HTMLElement;
const filterBarToggleBox = document.querySelector('#search-filter-bar-main-info') as HTMLElement;
const filterBar = document.querySelector('#search-filter-bar') as HTMLElement;
const filterStateIcon = document.querySelector('#search-filter-state-icon') as HTMLElement;
const filterOptionsGrid = document.querySelector('#search-filter-bar-options-area') as HTMLElement;

// Home and Browse ribbons.
const homeRibbon = document.querySelector('#home-ribbon') as HTMLElement;
const browseRibbon = document.querySelector('#browse-ribbon') as HTMLElement;

const backToNormalViewButton = document.querySelector('#back-to-normal-view-button');
const bookDisplayModeElement = document.querySelector('#book-display-controls');
const bookDisplayModeButtons = document.querySelectorAll(".display-mode-toggle-btn");

backToNormalViewButton.querySelector('img').addEventListener('click', () => {
    setSingleItemView(false);
})

//const test = getBookJsonData('dragon');

// Really ugly. But checks all at once if any of the filter elements have
// been used/enabled. If none have a value, then filters are not enabled.
function isAnyFilterEnabled() {
    return  completeCheckbox.checked                            ||
            incompleteCheckbox.checked                          ||
            completedBeforeDatepicker.selectedDates.length > 0  ||
            completedAfterDatepicker.selectedDates.length > 0   ||
            startedBeforeDatepicker.selectedDates.length > 0    ||
            startedAfterDatepicker.selectedDates.length > 0     ||
            publishedBeforeDatepicker.selectedDates.length > 0  ||
            publishedAfterDatepicker.selectedDates.length > 0   ||
            genreDropdown.value !== '';
}

function refreshFilterMainInfoVisuals() {
    const filterStateText = document.querySelector("#filter-state-text");
    if (isAnyFilterEnabled()) {

        filterStateText.classList.remove('filter-off-text');
        filterStateText.classList.add('filter-on-text');

        filterStateText.innerHTML = `
                                        <h3>
                                            Filter:
                                        </h3>
                                        <h4>
                                            ON
                                        </h4>
                                    `;
    }
    else 
    {
        filterStateText.classList.remove('filter-on-text');
        filterStateText.classList.add('filter-off-text');

        filterStateText.innerHTML = `
                                        <h3>
                                            Filter:
                                        </h3>
                                        <h4>
                                            OFF
                                        </h4>
                                    `;
    }
}

function refreshBookDisplay() {

    const bookList = fetchedBooks;

    bookList.forEach((bookItem: BookItem) => {
        bookItem.destroyCustomElements();
    });
    document.querySelectorAll('.flatpickr-calendar:not(.persistent-calendar)').forEach((calendar) => {
        calendar.remove();
    });
    bookDisplay.innerHTML = "";

    bookList.forEach((bookItem: BookItem) => {

        let isAdded = addedBooks.has(bookItem.lib_data.key);
        let fullHtml = bookItem.generateMainHtml();

        fullHtml += bookItem.generateAddButtonHtml(isAdded);

        let bookItemDiv = $("<div>")
                        .attr("id", bookItem.getTrueWorkID())
                        .addClass("book-item")
                        .html(fullHtml);
        
        $(bookItemDiv).appendTo(bookDisplay);

        bookItem.populateCustomElements(addedBooks);
    });
}

function filterBooks() {

    if (unfilteredFetchedBooks.length < 1 || (!browsingFullDatabase && addedBooks.size < 1))
        return;

    fetchedBooks = unfilteredFetchedBooks.slice();
    // Complete box and incomplete box are mutually exclusive, and just check if
    // book is completed after the current date
    if (completeCheckbox.checked && !incompleteCheckbox.checked) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.finishedDatepicker.selectedDates.length > 0);
    }
    if (incompleteCheckbox.checked && !completeCheckbox.checked) {
        fetchedBooks = fetchedBooks.filter((bookItem) => !(bookItem.finishedDatepicker.selectedDates.length > 0));
    }

    // Completed after and completed before filters.
    if (completedBeforeDatepicker.selectedDates.length > 0) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.isCompletedBeforeDate(completedBeforeDatepicker.selectedDates[0]));

    }
    if (completedAfterDatepicker.selectedDates.length > 0) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.isCompletedAfterDate(completedAfterDatepicker.selectedDates[0]));
    }

    // Started after and started before filters.
    if (startedBeforeDatepicker.selectedDates.length > 0) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.isStartedBeforeDate(startedBeforeDatepicker.selectedDates[0]));
    }
    if (startedAfterDatepicker.selectedDates.length > 0) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.isStartedAfterDate(startedAfterDatepicker.selectedDates[0]));
    }

    // Published after and published before filters 
    // (just uses year; too many api calls to get specific pub. dates)
    if (publishedBeforeDatepicker.selectedDates.length > 0) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.isPublishedBeforeDate(publishedBeforeDatepicker.selectedDates[0]));
    }
    if (publishedAfterDatepicker.selectedDates.length > 0) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.isPublishedAfterDate(publishedAfterDatepicker.selectedDates[0]));
    }

    // Genre
    if (genreDropdown.value != '' && genreDropdown.value != null) {
        fetchedBooks = fetchedBooks.filter((bookItem) => bookItem.containsGenre(genreDropdown.value));
    }

    //console.log(fetchedBooks);
    return fetchedBooks;
}

// lazy
function filterAndRefreshBooks() {
    refreshFilterMainInfoVisuals();
    filterBooks();
    refreshBookDisplay();
}

async function fetchAndFilterBooks() {
    document.body.style.cursor = "wait";
    fetchedBooks = [];

    //console.log(addedBooks);

    if ((searchBarValue == null || searchBarValue == '') && !browsingFullDatabase) {
        addedBooks.forEach((book) => fetchedBooks.push(book));
    }
    else {
        let fetchedSearchBooks, fetchedSearchBooksGenres;
        try {
            fetchedSearchBooks = await getBookJsonData(searchBarValue);
            fetchedSearchBooksGenres = await getSearchQuerySubjectData(searchBarValue);
        }
        finally {
            if (fetchedSearchBooks != null && fetchedSearchBooksGenres != null) {
            
                fetchedSearchBooks.docs.forEach((book : OpenLibrarySearchElement) => {
    
                    // Get books already added if unique key matches one.
                    if (addedBooks.has(book.key)) {
                        const existingBook = addedBooks.get(book.key)
                        fetchedBooks.push(existingBook);
                        return;
                    }
    
                    // Otherwise, generate a new BookItem object.
                    let fetchedBook = new BookItem(book);
    
                    //console.log(book);
                    fetchedBooks.push(fetchedBook);
                });
    
                // Genre search api returns same order of results as normal search, so parse valid
                // 'subjects' to generate genres for each entry. This process basically removes
                // erroneous genres, and only adds broad ones we've defined as valid for filtering by.
                let fetchElement = 0; 
                fetchedSearchBooksGenres.docs.forEach((bookGenreList : OpenLibraryGenreElement) => {
                    if (bookGenreList.subject === undefined || bookGenreList.subject.length < 1)
                        return;
    
                    //console.log(bookGenreList);
                    bookGenreList.subject.forEach((genre) => {
                        if (genreOptions.has(genre) && fetchElement < fetchedBooks.length)
                            fetchedBooks[fetchElement].genres.add(genreOptions.get(genre));
                    });
                    fetchElement++;
                })
            }
        }
    }
    if (!browsingFullDatabase) {
        let onlyAddedBooks: BookItem[] = [];
        fetchedBooks.forEach((book) => {
            if (addedBooks.has(book.lib_data.key)) {
                onlyAddedBooks.push(book);
            }
        }) 

        fetchedBooks = onlyAddedBooks;
    }
    if (fetchedBooks.length == 0) {
        tryEnableTutorialBanner();
    }

    document.body.style.cursor = "";
    unfilteredFetchedBooks = fetchedBooks.slice();
    filterAndRefreshBooks();
}

function setSearchSectionHeader(value : string) {
    const header = searchHeader.querySelector('h3');
    if (header != null) {
        header.textContent = value;
    }
}

function setSingleItemView(value : boolean) {
    isSingleItemView = value;

    if (isSingleItemView) {
        bookDisplay.classList.remove('book-display-list');
        bookDisplay.classList.remove('book-display-grid');
        bookDisplay.classList.add('book-display-single');

        backToNormalViewButton.classList.remove('inactive-element');
        bookDisplayModeElement.classList.add('inactive-element');

        setSearchSectionHeader("Book details");
    }
    else{

        backToNormalViewButton.classList.add('inactive-element');
        bookDisplayModeElement.classList.remove('inactive-element');

        const allBookElements = document.querySelectorAll(".book-item");
        allBookElements.forEach((bookElement) => {
            bookElement.classList.remove('single-view-active-book-item');
        });

        const allSynopsisElements = document.querySelectorAll(".book-synopsis");
        allSynopsisElements.forEach((bookSynopsis) => {
            bookSynopsis.querySelector('span').textContent = '';
        });

        let headerString = '';
        if (browsingFullDatabase) {
            if (fetchedBooks.length > 0)
                headerString = "Search Results";
            else {
                headerString = "Browse Books";
            }
        }
        else{
            headerString = "My Books";
        }

        setSearchSectionHeader(headerString);

        toggleListView(false);
    }
}

function toggleListView(flipState : boolean) {

    if (flipState)
        listViewActive = !listViewActive;

    // Swap which class element has; dictates if it's a list or grid view.
    const fromClass = !listViewActive ? 'book-display-list' : 'book-display-grid';
    const toClass = listViewActive ? 'book-display-list' : 'book-display-grid';
    bookDisplay.classList.remove(fromClass);
    bookDisplay.classList.remove('book-display-single');
    bookDisplay.classList.add(toClass);

    // Remove and re-add class that does its fade-in animation
    bookDisplay.classList.remove('fade-in-active');
    void bookDisplay.offsetWidth;
    bookDisplay.classList.add('fade-in-active');
}

// Really lazy way to do this. Don't care!
function tryEnableTutorialBanner() {

    if (browsingFullDatabase) {
        if (hasSearchedOnce) {
            bookDisplay.innerHTML = `
                                        <div class="book-display-intro">
                                            <h2>No Results!</h2>
                                            <h2></h2>
                                        </div>
                                    `
        }
        else{
            bookDisplay.innerHTML = `
                                        <div class="book-display-intro">
                                            <h2>Use the search bar at the top of the screen to find your favorite books!</h2>
                                            <h2>You can also enable filters for the results using the 'Filter' tab above!</h2>
                                        </div>
                                    `;
        }
    }
    else{
        if (hasSearchedOnce) {
            bookDisplay.innerHTML = `
                                        <div class="book-display-intro">
                                            <h2>You currently have no books in your reading list.</h2>
                                        </div>
                                    `;
        }
        else {
            bookDisplay.innerHTML = `
                                        <div class="book-display-intro">
                                            <span class="Welcome-banner">Welcome <span id="username-highlight">${localStorage.getItem('username')}</span>!</span>
                                            <h2>You currently have not added any books to your reading list.</h2>
                                            <h2>Click the browse ribbon on the left to get started!</h2>
                                        </div>
                                    `;
        }
    }
    
}

function bookDisplayEventListeners(){

    // Display mode button - on click.
    bookDisplayModeButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('book-display-controls-btn-is-toggled')) {

                const toggleToClass = listViewActive ? 'book-display-controls-grid-btn' : 'book-display-controls-list-btn';
                if (btn.classList.contains(toggleToClass)) {
                    
                    bookDisplayModeButtons.forEach((btn) => {
                        btn.classList.remove('book-display-controls-btn-is-toggled');
                    });

                    btn.classList.add('book-display-controls-btn-is-toggled');
                    toggleListView(true);
                }
            }
        });
    });

    // Search bar input element - on enter + on click search icon.
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {

            if (browsingFullDatabase) {
                setSearchSectionHeader("Search Results");
            }

            hasSearchedOnce = true;

            const target = e.target as HTMLInputElement;
            searchBarValue = target.value;
            fetchAndFilterBooks();
        }
    });

    // All event listeners for filter options
    completeCheckbox.addEventListener('change', (e) => {
        filterAndRefreshBooks();
    })
    incompleteCheckbox.addEventListener('change', (e) => {
        filterAndRefreshBooks();
    })
    
    genreDropdown.addEventListener('change', (e) => {
        filterAndRefreshBooks();
    })

    // Event listeners for section navigation ribbons.
    homeRibbon.addEventListener("click", () => {
        if (browsingFullDatabase) {
            browsingFullDatabase = false;
    
            const selectedNavClass = "selected-nav-section";
            if (!homeRibbon.classList.contains(selectedNavClass)) {
                homeRibbon.classList.add(selectedNavClass);
                browseRibbon.classList.remove(selectedNavClass);
            }
    
            setSearchSectionHeader("My Books");
            
            fetchedBooks = [];
            searchBarValue = '';
            searchInput.value = '';
    
            if (addedBooks.size == 0) {
                tryEnableTutorialBanner();
            }
            else {
                setSingleItemView(false);
                fetchAndFilterBooks();
            }
        }
    });
    
    browseRibbon.addEventListener("click", () => {
        if (!browsingFullDatabase) {
            browsingFullDatabase = true;
    
            const selectedNavClass = "selected-nav-section";
            if (!browseRibbon.classList.contains(selectedNavClass)) {
                browseRibbon.classList.add(selectedNavClass);
                homeRibbon.classList.remove(selectedNavClass);
            }
    
            setSearchSectionHeader("Browse Books");
            
            fetchedBooks = [];
            searchBarValue = '';
            searchInput.value = '';
            tryEnableTutorialBanner();
            setSingleItemView(false);
        }
    });

    // Search section/filter bar event listeners.
    searchIcon.addEventListener('click', () => {
        if (browsingFullDatabase) {
            setSearchSectionHeader("Search Results");
        }
    
        hasSearchedOnce = true;
    
        searchBarValue = searchInput.value;
        fetchAndFilterBooks();
    });
    
    filterBarToggleBox.addEventListener("click", () => {
        isFilterBarOpen = !isFilterBarOpen;
        if (isFilterBarOpen) {
    
            filterStateIcon.classList.remove('filter-state-icon-close-animation');
            filterStateIcon.classList.add('filter-state-icon-open-animation');
    
            filterBar.classList.remove('filter-area-close-animation');
            filterBar.classList.add('filter-area-open-animation');
    
            filterOptionsGrid.classList.remove('filter-options-close-animation');
            filterOptionsGrid.classList.add('filter-options-open-animation');
        }
        else {
            filterStateIcon.classList.remove('filter-state-icon-open-animation');
            filterStateIcon.classList.add('filter-state-icon-close-animation');
    
            filterBar.classList.remove('filter-area-open-animation');
            filterBar.classList.add('filter-area-close-animation');
    
            filterOptionsGrid.classList.remove('filter-options-open-animation');
            filterOptionsGrid.classList.add('filter-options-close-animation');
        }
    })
    
    // For each date picker, prevent invalid dates from being input that logically make no sense.
    // For example, we disallow an "after" picker from allowing dates after whatever is selected by
    // the corresponding "before" picker (since it can't be, say, before 1970 but after 1971).
    completedBeforeDatepicker.set('onChange', [
        (selectedDates : Date[]) => {
            if (selectedDates.length > 0)
                completedAfterDatepicker.set('maxDate', selectedDates[0]);
            else {
                completedAfterDatepicker.set('maxDate', new Date());
            }
            filterAndRefreshBooks();
        }
    ]);
    completedBeforeDatepicker.set('onKeyDown', [

    ]);
    completedAfterDatepicker.set('onChange', [
        (selectedDates : Date[]) => {
            if (selectedDates.length > 0)
                completedBeforeDatepicker.set('minDate', selectedDates[0]);
            else {
                completedBeforeDatepicker.set('minDate', null);
            }
            filterAndRefreshBooks();
        }
    ]);
    startedBeforeDatepicker.set('onChange', [
        (selectedDates : Date[]) => {
            if (selectedDates.length > 0)
                startedAfterDatepicker.set('maxDate', selectedDates[0]);
            else {
                startedAfterDatepicker.set('maxDate', new Date());
            }
            filterAndRefreshBooks();
        }
    ]);
    startedAfterDatepicker.set('onChange', [
        (selectedDates : Date[]) => {
            if (selectedDates.length > 0)
                startedBeforeDatepicker.set('minDate', selectedDates[0]);
            else {
                startedBeforeDatepicker.set('minDate', null);
            }
            filterAndRefreshBooks();
        }
    ]);
    publishedBeforeDatepicker.set('onChange', [
        (selectedDates : Date[]) => {
            if (selectedDates.length > 0)
                publishedAfterDatepicker.set('maxDate', selectedDates[0]);
            else {
                publishedAfterDatepicker.set('maxDate', new Date());
            }
            filterAndRefreshBooks();
        }
    ]);
    publishedAfterDatepicker.set('onChange', [
        (selectedDates : Date[]) => {
            if (selectedDates.length > 0)
                publishedBeforeDatepicker.set('minDate', selectedDates[0]);
            else {
                publishedBeforeDatepicker.set('minDate', null);
            }
            filterAndRefreshBooks();
        }
    ]);
    
    // Such a stupid way of doing this but whatever, gotta do this quick.
    // Just prevents CTRL + A and backspace. Must clear elsewhere.
    preventInvalidDatepickerInput(completedBeforeDatepicker.input);
    preventInvalidDatepickerInput(completedAfterDatepicker.input);
    preventInvalidDatepickerInput(startedBeforeDatepicker.input);
    preventInvalidDatepickerInput(startedAfterDatepicker.input);
    preventInvalidDatepickerInput(publishedBeforeDatepicker.input);
    preventInvalidDatepickerInput(publishedAfterDatepicker.input)
    
}

window.addEventListener('DOMContentLoaded', async () => {
    $(function(){

        bookDisplayEventListeners();
        tryEnableTutorialBanner();
        // if (test != null) {
        //     test.then((data : OpenLibrarySearchResponse) => {
        //         data.docs.forEach((book : OpenLibrarySearchElement) => {
        //             // Get books already added if unique key matches one.
        //             if (addedBooks.has(book.key)) {
        //                 fetchedBooks.push(addedBooks.get(book.key));
        //                 return;
        //             }

        //             // Otherwise, generate a new BookItem object.
        //             let fetchedBook = new BookItem(book);
        //             //console.log(book);
        //             fetchedBooks.push(fetchedBook);
        //         });
        //     });
        //     displaySearchedBooks();
        // }
    });
});
