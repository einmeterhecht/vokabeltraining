console.log("abfragen_js.js started");

var aufgabe_index = 0;
var beantwortet = false;

var enter_pressed = false;

var aufgaben = [];

var knacknuesse = [];
var nicht_sofort_klar = [];

var MAX_UNTIL_KNACKNUSS = 2;
var REPEAT_INTERVAL = 5;
var KNACKNUSS_CHECK_INTERVAL = 14;

function initialisiere_aufgabenliste () {
	for (i in liste.fragen){
	    aufgaben.push(i);
	}
    aufgaben = shuffle_array(aufgaben);
}

function shuffle_array(list){
	// Using Fisher-Yates algorithm:
	// https://bost.ocks.org/mike/shuffle/
	shuffled = [];
	// Create copy
	for (i in list){
		shuffled.push(list[i]);
	}
	
	remaining_elements = shuffled.length;
	
	while (remaining_elements != 0) {
		// Pick a remaining element...
		random_index = Math.floor(Math.random() * remaining_elements);
		remaining_elements--;
		// And swap it with the current element.
		random_element = shuffled[random_index];
		shuffled[random_index] = shuffled[remaining_elements];
		shuffled[remaining_elements] = random_element;
    }
	return shuffled;
}

function count_occurrences(list, item){
	count = 0;
	for (i in list){
		if (list[i] == item){
			count++;
		}
	}
	return count;
}

function remove_spaces_at_end(string) {
	while (string.endsWith(" ")){
        string = string.substring(0, string.length - 1);
	}
	return string;
}

function remove_content_in_brackets(string) {
	index = string.indexOf("(");
	while (index != -1) {
		until_bracket = string.substring(0, index);
		index_of_closing_bracket = string.indexOf(")", index);
		if (index_of_closing_bracket == -1) return string; // Bracket not closed
		after_bracket = string.substring(index_of_closing_bracket + 1, string.length);
		string = until_bracket + after_bracket;
		if (index == string.length) return string; // End of string
		index = string.indexOf("(", index);
	}
	return string;
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
	eingabe.focus(); // Cursor ins Eingabefeld setzen
}

function get_gefragte(){
	gefragte = [];
	for (key in get_frage()){
		if (key != liste.frage_attribut){
			gefragte.push(key);
		}
	}
	return gefragte;
}

function get_gefragtes_attribut(frage = get_frage()){
	for (key in frage){
		if (key != liste.frage_attribut){
	        return key;
		}
	}
	return "NotFound";
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

function eingabefeld_onkeyup(){
	if (enter_pressed) enter_pressed = false;
	else if (beantwortet){
		pruefe_eingabe();
	}
	else if (count_occurrences(eingabe.value, " ") > count_occurrences(get_gefragtes(), " ")){
		pruefe_eingabe();
	}
}

function antwort_anpassen(antwort){
	return remove_spaces_at_end(antwort).replace("jemand","jmd") // Deutsch
		.replace("jemanden","jmd")
		.replace("jemandem","jmd")
		.replace("jmd.","jmd")
		.replace("jnd.","jmd")
		.replace("etwas","etw")
		.replace("sb.","sb") // English
		.replace("somebody","sb")
		.replace("sb's","sbs")
		.replace("sth.","sth")
		.replace("something","sth")
		.replace("qn.","qn") // Franzoesisch
		.replace("qc.","qc")
		.replace("gen.","gen") // Latein
		.replace("genitiv","gen")
		.replace("dat.","dat")
		.replace("dativ","dat")
		.replace("akk.","akk")
		.replace("akkusativ","akk")
		.replace("abl.","abl")
		.replace("ablativ","abl")
		.replace(";","/") // Trennzeichen
		.replace(",","/")
		.replace(" /","/")
		.replace("/ ","/");
}

function input_correct(input=eingabe.value){
	loesung = antwort_anpassen(get_gefragtes(get_frage()));
	gegebene_antwort = antwort_anpassen(input);
	if (loesung.replace("(","").replace(")","") == 
	gegebene_antwort.replace("(","").replace(")","")) {
		return true;
	}
	else if (remove_spaces_at_end(
	remove_content_in_brackets(loesung).replace("  ", " ")) == gegebene_antwort) {
		return true;
	}
	return false;
}

function submit_eingabe(){
	if (!enter_pressed){
		enter_pressed = true;
		eingabe.value += " ";
		pruefe_eingabe();
	}
	return false;
}

function pruefe_eingabe(){
	if (beantwortet) {
		if (eingabe.selectionStart > 0) {
			char_entered = eingabe.value[eingabe.selectionStart - 1];
			if (char_entered == "<" || char_entered == ">") {
				// "Antwort war richtig"
				check_for_knacknuss();
				naechste_frage();
			}
			else if (char_entered == " ") {
				// Naechste Frage
				wiederholen();
				naechste_frage();
			}
		    return;
			// Andere Tasten werden ignoriert (Enter wird woanders gefangen)
		}
	}

	beantwortet = true;
	eingabe.value = remove_spaces_at_end(eingabe.value);
	
	
	if (input_correct()){
		eingabe.style.background = "#006604"; // Original AbfrageApp - Farbe
		gefragtes_attribut.innerHTML = "Richtig!"
		
		check_for_knacknuss();		
		naechste_frage();
	}
	else{
		eingabe.style.background = "#990000";
		gefragtes_attribut.innerHTML = "Falsch. Richtig wäre: " + get_gefragtes(get_frage());
		
		eingabe.value = eingabe.value + " "
	    eingabe.selectionStart = eingabe.selectionEnd = eingabe.value.length; // Set cursor to end
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

function wiederholen(){
	aufgabe = aufgaben[aufgabe_index];
	aufgaben.splice(aufgabe_index + REPEAT_INTERVAL + 1, 0, aufgabe);
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
	knacknuesse_string = "";
	for (i in knacknuesse){
		knacknuesse_string += get_gefragtes(liste.fragen[knacknuesse[i]]) + "<br>";
	}
	return knacknuesse_string.substring(0, knacknuesse_string.length - 4);
}

function get_knacknuesse_json(){
	knacknuesse_json = {
    "fragen": nicht_sofort_klar,
	"hinweis_attribute": liste.hinweis_attribute,
    "titel": "schwierige_" + liste.titel,
    "frage_attribut": liste.frage_attribut
    };
	//for (i in knacknuesse){
	//	knacknuesse_json.fragen.push(liste.fragen[knacknuesse[i]]);
	//}
	return JSON.stringify(knacknuesse_json);
}

function download(filename, contained_string) {
    element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contained_string));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();
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
