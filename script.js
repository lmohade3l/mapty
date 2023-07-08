'use strict';

// prettier-ignore

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {
    id = (Date.now() + '').slice(-10);
    date = new Date();
    clicks =0;

    constructor(coords, distance, duration) {
        this.coords = coords;   //[lat , lng]
        this.distance = distance;  //km
        this.duration = duration;  //min
    }

    _set_description() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout{
    type = 'running';
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.cal_pace();
        this._set_description();
    }

    cal_pace() {
        this.pace = this.duration / this.distance;
        // return this.pace;
    }
}

class Cycling extends Workout{
    type = 'cycling'
    constructor(coords, distance, duration, elevation_gain) {
        super(coords, distance, duration);
        this.elevation_gain = elevation_gain;
        this.cal_speed();
        this._set_description();
    }

    cal_speed() {
        this.speed = this.distance / (this.duration/60);

    }
}


class App {
    //Private 
    #map;
    #map_zoom = 13;
    #map_event;
    #workouts = [];

    constructor() {
        //Get user's location:
        this._get_position();
        //Get data from local storage:
        this._get_local_storage();
        //Even Listeners: 'this' keyword refers to the element on which the event-listener is attached.
        //Submitting the form on pressing enter:
        //FIXME what was the bind thing again?
        form.addEventListener('submit' , this._new_workout.bind(this));
        //Listen for the change of input type: (running/cycling)
        inputType.addEventListener('change' , this._toggle_elevation_field.bind(this));
        //Setting the center(we still don't have eny element to attach the event-handler to, so event delegation and the parent element)
        containerWorkouts.addEventListener('click' , this._move_to_popup.bind(this));
    }

    _get_position() {
        if(navigator.geolocation) 
            //when u call load map regularly the this keyword would be undefined.
            navigator.geolocation.getCurrentPosition(this._load_map.bind(this) , function() {
                alert('could not get your position');
            })
    }

    _load_map(position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
        const coords = [latitude , longitude];
        //Leaflet: //Display a map using a third-party library: Leaflet: OS JS library for mobile-friendly interactive maps.//We use a 'hosted' version for now.
        //Pass the html element in which we are gonna show the map.
        //Render a map on these coordinates.
        this.#map = L.map('map').setView(coords, this.#map_zoom);
        //Leaflet to show the map:
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        //Leaflet to show a marker on the location:
        //Figure-out where to add the event handler?
        this.#map.on('click' , this._show_form.bind(this));
        //Putting the markers on the map after the map is loaded.(data coming from the local storage)
        this.#workouts.forEach(work => this._render_workout_marker(work));
    } 

    _show_form(map_e) {
        //We have the map event in here but we need it when submitting the form outta this handler.
        this.#map_event = map_e;
        //Fill out the form:
        form.classList.remove('hidden');
        //Focus the cursor on the field:
        inputDistance.focus();
    }

    _hide_form() {
        //Empty the fields
        inputDistance.value = inputElevation.value = inputCadence.value = inputDuration.value = '';
        //Immediately hide the form without the anomation(simply adding the hidden class won't be enough)
        form.computedStyleMap.display = 'none';
        form.classList.add('hidden');
        //FIXME grid??
        setTimeout( () => form.computedStyleMap.display = 'grid' , 1000);
    }

    _toggle_elevation_field() {
         // Running/Cycling --> Candance/Elevation  so TOGGLE between these elements:
         inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
         inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _new_workout(e) {
        //Function to check if the inputs are valid:
        const valid_inputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const all_positive = (...inputs) => inputs.every(inp => inp>0);

        e.preventDefault();

        //Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat , lng} = this.#map_event.latlng;
        let workout;
        
        //If workout running: create running
        if (type === 'running') {
            const cadence = +inputCadence.value;
            //Check if data is valid
            if(
            //    !Number.isFinite(distance) ||
            //    !Number.isFinite(duration) ||
            //    !Number.isFinite(cadence) 
            !valid_inputs(distance, duration, cadence) ||
            !all_positive(distance, duration, cadence)
            )  return alert('Positive number pls!');
            //Create the running obj:
            workout = new Running([lat,lng] , distance, duration, cadence);
        }
        //If workout cycling: create cycling
        if(type === 'cycling') {
            const elevation = +inputElevation.value;
            //Check if data is valid
            if(!valid_inputs(distance, duration, elevation) || !all_positive(distance, duration))  
                return alert('Positive number pls!');
            workout = new Cycling([lat,lng] , distance, duration, elevation);
        }
        //Add new obj to workout array
        this.#workouts.push(workout);
        //Render workout on map as marker
        this._render_workout_marker(workout);
        //Render workout on list
        this._render_workout(workout);
        //Hide form + Clearing input fields:
        this._hide_form();
        //Set local storge to all workouts:
        this._set_local_storage();
    }

    _render_workout_marker(workout) {
        //the 'map_event' stores the exact location which was clicked on the map.
        //Displaying the marker on the map.
        L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            //Attach a css element:
            className: `${workout.type}-popup`,
        }))
        .setPopupContent(`${workout.description}`).openPopup();
    }

    _render_workout(workout) {
        //make html elemetns then pass it into the dom:
        let html =`
            <li class="workout workout--${workout.type}" data-id=${workout.id}>
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${workout.type==='running'?'🏃‍♂️' : '🚴‍♂️'}</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>`;
        if(workout.type === 'running') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>`;}
        if(workout.type === 'cycling') {
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.elevation_gain}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>`;}

        //Adding to the DOM:
        form.insertAdjacentHTML('afterend' , html);

    }

    _move_to_popup(e) {
        if(!this.#map) return;
        //where ever clicked in workout container, we find the exact workout element by id:
        const workout_element = e.target.closest('.workout');
        //If clicked somewhere elese return:
        if(!workout_element) return;
        //Find the workout on which the click happened:
        const workout = this.#workouts.find(work => work.id === workout_element.dataset.id);
        //Cnter the map
        //FIXME Documentation.
        this.#map.setView(workout.coords , this.#map_zoom , {
            animate: true,
            pan: {
                duration:1
            }
        });
        //Using the Public Interface:
        //data coming from the local storge won't inherit this method:
        // workout.click();
    } 

    _set_local_storage() {
        localStorage.setItem('workouts' , JSON.stringify(this.#workouts))
    }

    _get_local_storage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        //objects coming from local storage won't inherit all the methods.
        //they're no longer objects of classes 'running' and ' cycling'
        if(!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {this._render_workout(work)});
    }

    reset() {
        //removing items from the local storage.
        localStorage.removeItem('workouts');
        //
        location.reload();
    }
}


const app = new App();




//Geolocation API: an api for internationalization, timers or anything that the browser gives us.


   
    

