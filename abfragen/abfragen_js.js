console.log("abfragen_js.js started");

var aufgabe_index = 0;
var beantwortet = false;

var aufgaben = [];

var knacknuesse = [];
var nicht_sofort_klar = [];

var MAX_UNTIL_KNACKNUSS = 2;
var REPEAT_INTERVAL = 5;
var KNACKNUSS_CHECK_INTERVAL = 14;

function initialisiere_aufgabenliste () {
	for (var i in liste.fragen){
	    aufgaben.push(i);
	}
    aufgaben = shuffle_array(aufgaben);
}

function shuffle_array(list){
	// Using Fisher-Yates algorithm:
	// https://bost.ocks.org/mike/shuffle/
	var shuffled = [];
	// Create copy
	for (var i in list){
		shuffled.push(list[i]);
	}
	
	var remaining_elements = shuffled.length;
	
	while (remaining_elements != 0) {
		// Pick a remaining element...
		var random_index = Math.floor(Math.random() * remaining_elements);
		remaining_elements--;
		// And swap it with the current element.
		var random_element = shuffled[random_index];
		shuffled[random_index] = shuffled[remaining_elements];
		shuffled[remaining_elements] = random_element;
    }
	return shuffled;
}

function count_occurrences(list, item){
	var count = 0;
	for (var i in list){
		if (list[i] == item){
			count++;
		}
	}
	return count;
}

function get_frage(){
	return liste.fragen[aufgaben[aufgabe_index]];
}

function erste_aufgabe(){
	aufgabe_index = 0;
	beantwortet = false;
	initialisiere_aufgabenliste();
	frage_laden();
	update_progress();
}

function get_gefragte(){
	var gefragte = [];
	for (var key in get_frage()){
		if (key != liste.frage_attribut){
			gefragte.push(key);
		}
	}
	return gefragte;
}

function get_gefragtes_attribut(frage = get_frage()){
	for (var key in frage){
		if (key != liste.frage_attribut){
	        return key;
		}
	}
}

function get_gefragtes(frage = get_frage()){
	return String(frage[get_gefragtes_attribut(frage)][0]);
}

function frage_laden(){
	hinweis = "";
	if (get_gefragtes().startsWith("un ") ||
	    get_gefragtes().startsWith("une ")){
		hinweis = " (un/une)";
	}
	else if (get_gefragtes().startsWith("le ") ||
	         get_gefragtes().startsWith("la ") ||
	         get_gefragtes().startsWith("les ")||
	         get_gefragtes().startsWith("l'")){
		hinweis = " (le/la/l'/les)";
	}
	frage_attribut.innerHTML = liste.frage_attribut
	+ ": "
	+ get_frage()[liste.frage_attribut]
	+ hinweis;
	gefragtes_attribut.innerHTML = get_gefragtes_attribut() + ":";
	eingabe.style.background = "#EEEECC";
	eingabe.value = "";
	beantwortet = false;
}

function update_progress(){
	progress.max = liste.fragen.length;
	progress.value = liste.fragen.length + aufgabe_index - aufgaben.length;
	progress_text.innerHTML = String(progress.value) + " / " + String(progress.max)
	
}

function check_double_space(){
	if (beantwortet) {
		if (eingabe.value.endsWith(" ")) {
			wiederholen();
			naechste_frage();
		}
		else {
			check_for_knacknuss();
			naechste_frage();
		}
	}
    if (eingabe.value.endsWith(" ")){
		if (beantwortet){
			pruefe_eingabe();
		}
		else if (count_occurrences(eingabe.value, " ") == count_occurrences(get_gefragtes(), " ") + 1){
			pruefe_eingabe();
		}
	}
}

function antwort_anpassen(antwort){
	return antwort.replace("jemand","jmd")
		.replace("jemanden","jmd")
		.replace("jemandem","jmd")
		.replace("jmd.","jmd")
		.replace("jnd.","jmd")
		.replace("etwas","etw")
		.replace("gen.","gen")
		.replace("genitiv","gen")
		.replace("dat.","dat")
		.replace("dativ","dat")
		.replace("akk.","akk")
		.replace("akkusativ","akk")
		.replace("abl.","abl")
		.replace("ablativ","abl")
		.replace(";","/")
		.replace(", ","/")
		.replace(" /","/")
		.replace("/ ","/");
}

function input_correct(input=eingabe.value){
	var loesung = antwort_anpassen(get_gefragtes(get_frage()));
	var gegebene_antwort = antwort_anpassen(input);
	if (loesung/*.toUpperCase()*/ == gegebene_antwort/*.toUpperCase()*/){
		return true;
	}
	else{
		return false;
	}
}

function pruefe_eingabe(){
	beantwortet = true;
	if (eingabe.value.endsWith(" ")){
		eingabe.value = eingabe.value.substring(0, eingabe.value.length - 1);
	}
	
	eingabe.selectionStart = eingabe.selectionEnd = eingabe.value.length; // Set cursor to end
	
	if (input_correct()){
		eingabe.style.background = "#006604"; // Original AbfrageApp - Farbe
		gefragtes_attribut.innerHTML = "Richtig!"
		check_for_knacknuss();		
		naechste_frage();			
	}
	else{
		eingabe.style.background = "#990000";
		gefragtes_attribut.innerHTML = "Falsch. Richtig wäre: " + get_gefragtes(get_frage());
	}
}

function check_for_knacknuss() {
	aufgabe = aufgaben[aufgabe_index];
	if (count_occurrences(aufgaben, aufgabe) > MAX_UNTIL_KNACKNUSS && knacknuesse.indexOf(aufgabe) == -1){
		// Needed at least 3 attempts
		aufgaben.splice(aufgabe_index + KNACKNUSS_CHECK_INTERVAL + 1, 0, aufgabe);
		knacknuesse.push(aufgabe);
	}
}

function wiederholen(aufgabe){
	index_falsch_beantwortetes = aufgabe_index + REPEAT_INTERVAL + 1;
	aufgaben.splice(index_falsch_beantwortetes, 0, aufgabe);
	if (knacknuesse.indexOf(aufgabe) != -1){
		knacknuesse.splice(knacknuesse.indexOf(aufgabe), 1);
		// Repetition of difficult word
	}
	if (nicht_sofort_klar.indexOf(liste.fragen[aufgabe]) == -1){
		nicht_sofort_klar.push(liste.fragen[aufgabe]);
	}
}

function naechste_frage() {
	aufgabe_index++;
	update_progress();
	if (aufgabe_index >= aufgaben.length){
		fertig();
	}
	else{
		frage_laden();
	}
}

function get_knacknuesse(){
	var knacknuesse_string = "";
	for (var i in knacknuesse){
		knacknuesse_string += get_gefragtes(liste.fragen[knacknuesse[i]]) + "<br>";
	}
	return knacknuesse_string.substring(0, knacknuesse_string.length - 4);
}

function get_knacknuesse_json(){
	var knacknuesse_json = {
    "fragen": nicht_sofort_klar,
	"hinweis_attribute": liste.hinweis_attribute,
    "titel": "schwierige_" + liste.titel,
    "frage_attribut": liste.frage_attribut
    };
	//for (var i in knacknuesse){
	//	knacknuesse_json.fragen.push(liste.fragen[knacknuesse[i]]);
	//}
	return JSON.stringify(knacknuesse_json);
}

function download(filename, contained_string) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contained_string));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    //document.body.removeChild(dummy_element);
}

function fertig(){
	frage_attribut.innerHTML = "<b>FERTIG! " + String(liste.fragen.length) + " Wörter gelernt!</b>";
	if (knacknuesse.length == 0){
		gefragtes_attribut.innerHTML = "Diese W\u00f6rter sitzen.";
		
		download_schwierige_button.hidden = false;
		progress.hidden = true;
	}
	else if (knacknuesse.length == 1){
		gefragtes_attribut.innerHTML = "Gut gemacht.<br>Nur <i>" + get_knacknuesse() + "</i> war knifflig.";
		
		download_schwierige_button.hidden = false;
		progress.hidden = true;
	}
	else{
		gefragtes_attribut.innerHTML = "Geschafft!<br>" +
		Math.round(100 * (1 - (knacknuesse.length / liste.fragen.length))) + "% sitzen.<br>" +
		"Schwierig waren diese " + knacknuesse.length + ":<br>" +
		"<i>" + get_knacknuesse() + "</i>";

		download_schwierige_button.hidden = false;
		progress.hidden = true;
	}
	eingabe.remove();
	
}

function download_nicht_sofort_gewusste(){
	download('schwierige.js', "var liste = " + get_knacknuesse_json() + "; erste_aufgabe();");
}
