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
    },

    deleteUser(userId){
        if(this.users.has(userId))
        this.users.delete(userId);
        else throw new Error(`user with id ${userId} doesn't exist`);
    }


}

const usersCrud = new UserCRUD();

const btnClicked = (event) =>
{
    const btn = event.target;
    const userId = parseInt(btn.getAttribute('data-user-id'));
    const tr = state.tableRows.get(userId);
    let toDelete;
    let toDisplay;
    switch(btn.getAttribute('data-btn-type')){
        case 'delete':
            state.tableRows.get(userId).remove();
            state.tableRows.delete(userId);
            usersCrud.deleteUser(userId);
            break;
        case 'edit':
            

            const createInput = (td,content, type) =>{
                const input = document.createElement('input');
                input.setAttribute('type','text');
                input.value = content;
                input.setAttribute('data-input-column',type)
                input.style.pointerEvents= 'none';
                td.innerHTML = '';
                td.appendChild(input);
            }

            const tds = Array.from(tr.querySelectorAll('td[data-column-type]'));
            tds.forEach((td) => createInput(td,td.innerHTML,td.getAttribute('data-column-type')))
            toDelete = Array.from(tr.querySelectorAll(`.btn[data-active='true']`)); 
            toDisplay = Array.from(tr.querySelectorAll(`.btn[data-active='false']`)); 
            toDelete.forEach((btn) => btn.setAttribute('data-active','false'));
            toDisplay.forEach((btn) => btn.setAttribute('data-active','true'));
            // Array.from(tds.querySelectorAll(`.btn[data-active='false']`)).setAttribute('data-active','true');
            break;
        case 'cancel':
            toDelete = Array.from(tr.querySelectorAll(`.btn[data-active='true']`)); 
            toDisplay = Array.from(tr.querySelectorAll(`.btn[data-active='false']`)); 
            toDelete.forEach((btn) => btn.setAttribute('data-active','false'));
            toDisplay.forEach((btn) => btn.setAttribute('data-active','true'));
            const tds1 = Array.from(tr.querySelectorAll('td[data-column-type]'));
            
    }
}

const createTableRow = (user) => {
    const tr = document.createElement('tr');
    const buttonsTd = document.createElement('td');
    const createTd = (content, type) =>{
        const td = document.createElement('td');
        td.innerHTML = content;
        td.setAttribute('data-column-type',type);
        tr.appendChild(td);
    }

    const createButton = (btnType, isActive) =>{
        const btn = document.createElement('button');
        btn.innerHTML = btnType;
        btn.classList.add('btn');
        btn.setAttribute('data-btn-type',btnType);
        btn.setAttribute('data-active',isActive);
        btn.setAttribute('data-user-id',user.id);
        btn.addEventListener('click',btnClicked);
        buttonsTd.appendChild(btn);
    }
    createTd(user.id,'id');
    createTd(user.firstName,'firstName');
    createTd(user.lastName,'lastName');
    createTd(user.capsule,'capsule');
    createTd(user.age,'age');
    createTd(user.city,'city');
    createTd(`<i class="fas fa-${user.gender === 'Female' ? 'female' : 'male'}"></i>`,'gender');
    createTd(user.hobby,'hobby');
    
    createButton('edit','true');
    createButton('delete','true');
    createButton('cancel','false');
    createButton('confirm','false');

    tr.appendChild(buttonsTd);
    state.tableRows.set(user.id,tr);
    return tr;
}

const addUsersToTable = (usersToDisplay) => {
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
        if(!event.target.value) addUsersToTable(usersCrud.sortUsers(state.currentFilter));
        addUsersToTable(usersCrud.search(state.currentSearchMode, event.target.value));
    });

    const tableHeaders = Array.from(document.querySelectorAll('th[data-column]'));
    tableHeaders.forEach((header) =>{
        header.addEventListener('click', (event) =>{
            state.currentFilter = event.target.getAttribute('data-column')
            addUsersToTable(usersCrud.sortUsers(state.currentFilter));
            tableHeaders.forEach((h) => h.setAttribute('data-filter','false'));
            event.target.setAttribute('data-filter','true');
        })
    })
}

init();