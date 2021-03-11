const table = document.querySelector('tbody');
const toolbar = document.querySelector('toolbar');

const state = {
    currentFilter: 'none',
    currentSearchMode: 'id'
}

class APIHandler {
    constructor(apiAdress) {
        this.apiAdress = apiAdress;
        this.isLoading = false;
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
    }

    endLoading() {
        this.isLoading = false;
        //TODO:hide spinner
    }
}

const apiHandler = new APIHandler('https://apple-seeds.herokuapp.com/api/users/');

function User(argsmap) {
    this.id = argsmap.id;
    this.firstName = argsmap.firstName;
    this.lastName = argsmap.lastName;
    this.capsule = argsmap.capsule;
    this.getUserInfoData()
}

User.prototype = {
    async getUserInfoData() {
        const data = await apiHandler.getDataFromApi(this.id);
        Object.assign(this, data);
    }
}


function UserCRUD() {
    this.users = new Map();
}

UserCRUD.prototype = {
    async getAllUsers () {
        return await apiHandler.getDataFromApi();
    },
    async createUsersDataset(){
        const allUsers = await this.getAllUsers();

        allUsers.forEach((user) => this.users.set(user.id, new User(user)));
        console.log(this.users);
    },
    sortUsers(sortBy){
        let sortFunction;
        switch(sortBy){
            case 'firstName':
            case 'lastName':
            case 'city':
            case 'gender':
            case 'hobby':
                sortFunction = (a,b) => a[sortBy].localeCompare(b[sortBy]);
                break;    
            case 'id':
            case 'capsule':
            case 'age':
                sortFunction = (a,b) => a[sortBy] - b[sortBy];
                break;
            default:
                throw new Error(`cannot sort by ${sortBy}`);
        }
        return Array.from(this.users.values()).sort(sortFunction);
    },
    search(searchBy, value){
        return Array.from(this.users.values()).filter((user) => {
            const temp = (user[searchBy]+'').toLowerCase();
            return temp.startsWith(value.toLowerCase());
        });
    },
    searchUserById(userId){
        return this.users.get(userId);
    },
    editUser(argsmap){
        if(argsmap.id && this.users.has(argsmap.id)){
            this.searchUserById(argsmap.id).assign(argsmap);
        }
        else throw new Error(`user id ${argsmap.id} does not exist`);
    }


}

const usersCrud = new UserCRUD();


const createTableRow = (user) => {
    const tr = document.createElement('tr');

    const tdId = `<td>${user.id}</td>\n`;
    const tdFirstName = `<td>${user.firstName}</td>\n`;
    const tdLastName = `<td>${user.lastName}</td>\n`;
    const tdCapsule = `<td>${user.capsule}</td>\n`;
    const tdAge = `<td>${user.age}</td>\n`;
    const tdCity = `<td>${user.city}</td>\n`;
    const tdGender = `<td><i class="fas fa-${user.gender === 'Female' ? 'female' : 'male'}"></i></td>\n`;
    const tdHobby = `<td>${user.hobby}</td>\n`;

    const buttonEdit = `<button class='btn' data-btn-type='edit' data-active='true'>Edit</button>\n`
    const buttonDelete = `<button class='btn' data-btn-type='delete' data-active='true'>Delete</button>\n`
    const buttonCancel = `<button class='btn' data-btn-type='cancel' data-active='false'>Cancel</button>\n`
    const buttonConfirm = `<button class='btn' data-btn-type='confirm' data-active='false'>Confirm</button>\n`
    const tdButtons = `<td>\n ${buttonEdit}${buttonDelete}${buttonCancel}${buttonConfirm}</td>\n`;
    const htmlTableRow = tdId + tdFirstName + tdLastName + tdCapsule + tdAge + tdCity + tdGender + tdHobby + tdButtons;
    tr.innerHTML = htmlTableRow;

    return tr;
}

const addUsersToTable = (usersToDisplay) => {
    // const usersInOrder = usersCrud.sortUsers('lastName');
    table.innerHTML = '';
    usersToDisplay.forEach((user) => {
        const tr = createTableRow(user);
        table.appendChild(tr);
    });
}

const init = async () => {
    await usersCrud.createUsersDataset();
    setTimeout(() => {
        addUsersToTable(usersCrud.sortUsers('id'));
    },4000);

    document.querySelector('#search-by').addEventListener('change',(event)=>{
        state.currentSearchMode = event.target.value;
        document.querySelector('#search-input').value = '';
        console.log(state.currentSearchMode);
    });

    document.querySelector('#search-input').addEventListener('input',(event)=>{
        console.log(usersCrud.search(state.currentSearchMode, event.target.value));
        addUsersToTable(usersCrud.search(state.currentSearchMode, event.target.value));
    });
}

init();