const table = document.querySelector('tbody');

const state = {
    currentFilter: 'id',
    currentSearchMode: 'id',
    tableRows: new Map(),
}

class APIHandler {
    constructor(apiAdress) {
        this.apiAdress = apiAdress;
        this.isLoading = false;
        this.spinner = document.querySelector(".spinner");
    }

    async getDataFromApi(userid = '') {
        this.startLoading()
        const response = await fetch(`${this.apiAdress}${userid}`);
        if (response.status !== 200) {
            throw 400;
        }
        const data = await response.json();
        this.endLoading();
        return data;
    }

    startLoading() {
        this.isLoading = true;
        //TODO:show spinner
        this.spinner.classList.remove("display--hide");
        table.parentElement.classList.add('display--hide');

    }

    endLoading() {
        this.isLoading = false;
        //TODO:hide spinner
        this.spinner.classList.add("display--hide");
        table.parentElement.classList.remove('display--hide');

    }
}

const apiHandler = new APIHandler('https://apple-seeds.herokuapp.com/api/users/');

function User(argsmap) {
    this.id = argsmap.id;
    this.firstName = argsmap.firstName;
    this.lastName = argsmap.lastName;
    this.capsule = argsmap.capsule;
    this.age = argsmap.age;
    this.hobby = argsmap.hobby;
    this.city = argsmap.city;
    this.gender = argsmap.gender;
}

User.prototype = {
    async getUserInfoData() {
        const data = await apiHandler.getDataFromApi(this.id);
        Object.assign(this, data);
    },

    isValidAge(age) {
        return !isNaN(age) && age > 0 && age < 120;
    },

    isValidCapsule(capsule) {
        return !isNaN(capsule) && capsule > 0;
    },

    isValidString(str) {
        return str.length > 0 && /^[a-zA-Z\s]*$/.test(str);
    },

    isValidGender(gender) {
        return gender.toLowerCase() === 'male' || gender.toLowerCase() === 'female';
    },
    validProperty(property, value) {
        let validationFunc;
        switch (property) {
            case 'firstName':
            case 'lastName':
            case 'hobby':
            case 'city':
                validationFunc = this.isValidString;
                break;
            case 'age':
                validationFunc = this.isValidAge;
                break;
            case 'capsule':
                validationFunc = this.isValidCapsule;
                break;
            case 'gender':
                validationFunc = this.isValidGender;
                break;
            default:
                throw new Error('no such property as ' + property);
        }
        return validationFunc(value);
    },
    setProperty(property, value) {

        this[property] = value;
    }

}

function UserCRUD() {
    this.users = new Map();
}

UserCRUD.prototype = {
    async getDataFromLocalStorage() {
        let temp = JSON.parse(localStorage.getItem('allUsers'));
        temp = temp.map((elem) => [elem[0], new User(elem[1])]);
        this.users = new Map(temp);
    },
    async getAllUsers() {
        return await apiHandler.getDataFromApi();
    },
    async createUsersDataset() {
        const allUsers = await this.getAllUsers();

        for (let i = 0; i < allUsers.length; i++) {
            const user = allUsers[i];
            const newUser = new User(user);
            await newUser.getUserInfoData();
            this.users.set(user.id, newUser);
        }
    },
    sortUsers(sortBy) {
        let sortFunction;
        switch (sortBy) {
            case 'firstName':
            case 'lastName':
            case 'city':
            case 'gender':
            case 'hobby':
                sortFunction = (a, b) => a[sortBy].localeCompare(b[sortBy]);
                break;
            case 'id':
            case 'capsule':
            case 'age':
                sortFunction = (a, b) => a[sortBy] - b[sortBy];
                break;
            default:
                throw new Error(`cannot sort by ${sortBy}`);
        }
        return Array.from(this.users.values()).sort(sortFunction);
    },
    search(searchBy, value) {
        return Array.from(this.users.values()).filter((user) => {
            const temp = (user[searchBy] + '').toLowerCase();
            return temp.startsWith(value.toLowerCase());
        });
    },
    searchUserById(userId) {
        return this.users.get(userId);
    },
    editUser(argsmap) {
        if (argsmap.id !== undefined && this.users.has(argsmap.id)) {
            Object.assign(this.searchUserById(argsmap.id), argsmap);
        }
        else throw new Error(`user id ${argsmap.id} does not exist`);
    },
    deleteUser(userId) {
        if (this.users.has(userId))
            this.users.delete(userId);
        else throw new Error(`user with id ${userId} doesn't exist`);
    }
}

const usersCrud = new UserCRUD();

function AppUi() {
    this.initializeUi();
}

AppUi.prototype = {
    async initializeUi() {
        if (localStorage.getItem('allUsers') === null || localStorage.getItem('allUsers') === []) {
            await usersCrud.createUsersDataset();
            localStorage.setItem('allUsers', JSON.stringify([...usersCrud.users]));
        }
        else {
            usersCrud.getDataFromLocalStorage();
        }
        this.addUsersToTable(usersCrud.sortUsers(state.currentFilter));
        this.setToolbar();
        this.setFilterListeners();
        document.querySelector('.refresh-btn').addEventListener('click', (event) => this.refreshList());
    },
    updateLocalStorage() {
        localStorage.setItem('allUsers', JSON.stringify([...usersCrud.users]));
    },
    deleteUser(userId) {
        state.tableRows.get(userId).remove();
        state.tableRows.delete(userId);
        usersCrud.deleteUser(userId);
        AppUi.prototype.updateLocalStorage();
    },

    switchButtons(tr) {
        const toDelete = Array.from(tr.querySelectorAll(`.btn[data-active='true']`));
        const toDisplay = Array.from(tr.querySelectorAll(`.btn[data-active='false']`));
        toDelete.forEach((btn) => btn.setAttribute('data-active', 'false'));
        toDisplay.forEach((btn) => btn.setAttribute('data-active', 'true'));
    },

    editUser(userId) {
        const tr = state.tableRows.get(userId);
        const userData = usersCrud.searchUserById(userId);
        const fields = Array.from(tr.querySelectorAll('td[data-column-type]'));
        console.log(fields);
        const obj = {};
        fields.forEach((field) => {
            const columnType = field.getAttribute('data-column-type');
            field.innerHTML = '';
            const input = document.createElement('input');
            input.value = userData[columnType];
            input.setAttribute('data-column-type', columnType);
            field.appendChild(input);
        });
        AppUi.prototype.switchButtons(tr);
        AppUi.prototype.updateLocalStorage();

    },

    cancel(userId) {
        const tr = state.tableRows.get(userId);
        const userData = usersCrud.searchUserById(userId);
        const fields = Array.from(tr.querySelectorAll('td[data-column-type]'));
        console.log(fields);
        fields.forEach((field) => {
            const columnType = field.getAttribute('data-column-type');
            field.innerHTML = userData[columnType];
            if (columnType === 'gender')
                field.innerHTML = `<i class="fas fa-${userData[columnType].toLowerCase() === 'female' ? 'female' : 'male'}"></i>`;
        });
        AppUi.prototype.switchButtons(tr);
    },

    confirm(userId) {
        const tr = state.tableRows.get(userId);
        const userData = usersCrud.searchUserById(userId);
        const fields = Array.from(tr.querySelectorAll('td[data-column-type]'));
        const isValidData = fields.every((field) => {
            const input = field.querySelector('input[data-column-type]');
            const columnType = field.getAttribute('data-column-type');
            return userData.validProperty(columnType, input.value)
        });
        if (isValidData) {
            fields.forEach((field) => {
                const input = field.querySelector('input[data-column-type]');
                const columnType = field.getAttribute('data-column-type');
                userData.setProperty(columnType, input.value)
                field.innerHTML = userData[columnType];
                if (columnType === 'gender')
                    field.innerHTML = `<i class="fas fa-${userData[columnType].toLowerCase() === 'female' ? 'female' : 'male'}"></i>`;
            });
            usersCrud.editUser(userData);
            AppUi.prototype.switchButtons(tr);
        }
        else fields.forEach((field) => {
            const columnType = field.getAttribute('data-column-type');
            const input = field.querySelector('input[data-column-type]');
            if (!userData.validProperty(columnType, input.value))
                input.style.boxShadow = '0 0 5pt 2pt red';
            else
                input.style.boxShadow = 'none';
            input.style.outlineWidth = '0px';

        })
        AppUi.prototype.updateLocalStorage();

    },

    btnClicked(event) {
        const btn = event.target;
        const userId = parseInt(btn.getAttribute('data-user-id'));
        const tr = state.tableRows.get(userId);
        switch (btn.getAttribute('data-btn-type')) {
            case 'edit':
                AppUi.prototype.editUser(userId);
                break;
            case 'delete':
                AppUi.prototype.deleteUser(userId);
                break;
            case 'cancel':
                AppUi.prototype.cancel(userId);
                break;
            case 'confirm':
                AppUi.prototype.confirm(userId);
                break;
            default:
                throw new Error(`unnkown button of type "${btn.getAttribute('data-btn-type')}"`);
        }
    },

    createTableRow(user) {
        const tr = document.createElement('tr');
        const buttonsTd = document.createElement('td');

        const createTd = (content, type) => {
            const td = document.createElement('td');
            td.innerHTML = content;
            td.setAttribute('data-column-type', type);
            tr.appendChild(td);
        }

        const createButton = (btnType, isActive) => {
            const btn = document.createElement('button');
            btn.innerHTML = btnType;
            btn.classList.add('btn');
            btn.setAttribute('data-btn-type', btnType);
            btn.setAttribute('data-active', isActive);
            btn.setAttribute('data-user-id', user.id);
            btn.addEventListener('click', this.btnClicked);
            buttonsTd.appendChild(btn);
        }
        const td = document.createElement('td');
        td.innerHTML = user.id;
        tr.appendChild(td);
        createTd(user.firstName, 'firstName');
        createTd(user.lastName, 'lastName');
        createTd(user.capsule, 'capsule');
        createTd(user.age, 'age');
        createTd(user.city, 'city');
        createTd(`<i class="fas fa-${user.gender === 'Female' ? 'female' : 'male'}"></i>`, 'gender');
        createTd(user.hobby, 'hobby');

        createButton('edit', 'true');
        createButton('delete', 'true');
        createButton('cancel', 'false');
        createButton('confirm', 'false');

        tr.appendChild(buttonsTd);
        state.tableRows.set(user.id, tr);
        return tr;
    },

    addUsersToTable(usersInDisplay) {
        console.log(usersInDisplay);
        table.innerHTML = '';

        for (let i = 0; i < usersInDisplay.length; i++) {
            const tr = this.createTableRow(usersInDisplay[i]);
            table.appendChild(tr);
        }
    },

    setToolbar() {
        document.querySelector('#search-by').addEventListener('change', (event) => {
            state.currentSearchMode = event.target.value;
            document.querySelector('#search-input').value = '';
            console.log(state.currentSearchMode);
        });

        document.querySelector('#search-input').addEventListener('input', (event) => {
            console.log(usersCrud.search(state.currentSearchMode, event.target.value));
            if (!event.target.value) AppUi.prototype.addUsersToTable(usersCrud.sortUsers(state.currentFilter));
            else AppUi.prototype.addUsersToTable(usersCrud.search(state.currentSearchMode, event.target.value));
        });
    },

    setFilterListeners() {
        const tableHeaders = Array.from(document.querySelectorAll('th[data-column]'));
        tableHeaders.forEach((header) => {
            header.addEventListener('click', (event) => {
                state.currentFilter = event.target.getAttribute('data-column')
                addUsersToTable(usersCrud.sortUsers(state.currentFilter));
                tableHeaders.forEach((h) => h.setAttribute('data-filter', 'false'));
                event.target.setAttribute('data-filter', 'true');
            })
        })
    },

    async refreshList() {
        localStorage.removeItem('allUsers');
        await usersCrud.createUsersDataset();
        localStorage.setItem('allUsers', JSON.stringify([...usersCrud.users]));
        console.log(usersCrud.users);
        console.log(usersCrud.sortUsers(state.currentFilter));
        AppUi.prototype.addUsersToTable(usersCrud.sortUsers(state.currentFilter));
    }

}

const appUi = new AppUi();