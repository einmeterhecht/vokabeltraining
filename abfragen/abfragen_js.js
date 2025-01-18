console.log("abfragen_js.js started");

var aufgabe_index = 0;
var beantwortet = false;

var aufgaben = [];

var knacknuesse = [];
var nicht_sofort_klar = [];
var erledigte = [];

var MAX_UNTIL_KNACKNUSS = 2;
var REPEAT_INTERVAL = 5;
var KNACKNUSS_CHECK_INTERVAL = 14;
var frage_attribut;

function fortschritt_laden() {
	let learned = base64url_to_booleans(get_url_parameter("progress"));
	for (i in learned) {
		if (learned[i]) erledigte.push(i);
	}
}

function initialisiere_aufgabenliste () {
	for (i in liste.fragen){
	    if (erledigte.indexOf(i) == -1) aufgaben.push(i);
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

function remove_trailing_spaces(string) {
	while (string.endsWith(" ")){
        string = string.substring(0, string.length - 1);
	}
	return string;
}

function trim(string) {
	while (string.startsWith(" ")){
		string = string.substring(1, string.length);
	}
	while (string.endsWith(" ")){
        string = string.substring(0, string.length - 1);
	}
	return string;
}

function remove_content_in_brackets(string) {
	let index = string.indexOf("(");
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

const base64urlchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function booleans_to_base64url(booleans) {
	while (booleans.length % 6 !== 0) booleans.push(false);
	let str = "";
	for (let i = 0; i < booleans.length; i += 6) {
		let char_index = 0;
	    for (let j = 0; j < 6; j++) {
            char_index += booleans[i + j] ? 2 ** (5 - j) : 0;
	    }
		str += base64urlchars[char_index]
    }
	return str;
}

function base64url_to_booleans(base64url) {
	booleans = [];
	for (const char of base64url) {
		char_index = base64urlchars.indexOf(char);
		for (let j = 5; j >= 0; j--) {
			booleans.push((char_index & (1 << j)) != 0);
		}
	}
	return booleans;
}

function get_frage(){
	return liste.fragen[aufgaben[aufgabe_index]];
}

function erste_aufgabe(){
	aufgabe_index = 0;
	beantwortet = false;
	frage_attribut = decodeURIComponent(get_url_parameter("askwith", liste.frage_attribut));
	console.log(get_url_parameter("askwith", liste.frage_attribut), decodeURIComponent(get_url_parameter("askwith", liste.frage_attribut)));
	//gefragtes_attribut = get_url_parameter("askfor", get_gefragtes_attribut());
	fortschritt_laden();
	initialisiere_aufgabenliste();
	frage_laden();
	update_progress();
	eingabe.focus(); // Cursor ins Eingabefeld setzen
	document.getElementById("eingabe").addEventListener("keyup", eingabefeld_onkeyup);
}

function get_gefragte(){
	gefragte = [];
	for (key in get_frage()){
		if (key != frage_attribut){
			gefragte.push(key);
		}
	}
	return gefragte;
}

function get_gefragtes_attribut(frage = get_frage()){
	for (key in frage){
		if (key != frage_attribut){
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
	fade_text(document.getElementById("fragestellung"),
	    "<div style='display: inline;'>"
		+ frage_attribut.replaceAll("_", " ")
		+ ": "
		+ get_frage()[frage_attribut][0].replaceAll(
		"^2", "²").replace(
		"^x", "ˣ").replace(
		"^x", "ˣ").replace(
		"*", "⋅")
		+ ' </div><div style="white-space: nowrap; display: inline;">' + hinweis + "</div>"
	);
	fade_text(
	    document.getElementById("eingabeaufforderung"),
	    get_gefragtes_attribut().replaceAll("_", " ") + ":"
	);
	eingabe.classList.remove("incorrect");
	eingabe.classList.remove("correct");
	eingabe.value = "";
	beantwortet = false;
}

function update_progress(){
	fragen_geloest = liste.fragen.length + aufgabe_index - aufgaben.length;
	fragen_gesamt = liste.fragen.length;
	progress_text.innerHTML = String(fragen_geloest) + " / " + String(fragen_gesamt);
	document.querySelector("#progress>.progress_bar_value").style.width=(fragen_geloest/ fragen_gesamt*100  + "%");
}

function fade_text(target, new_text) {
	target.classList.remove("fade_in");
	if (target.innerHTML == new_text) return;
	target.classList.add("fade_out");
	setTimeout(() => {
		target.classList.remove("fade_out");
        target.innerHTML = new_text;
		target.classList.add("fade_in");
      }, 50);
}

function eingabefeld_onkeyup(e){
	if (beantwortet){
		pruefe_eingabe(e.key=="a");
	}
	else if (e.key=="Enter" || count_occurrences(eingabe.value, " ") > count_occurrences(get_gefragtes(), " ")){
		pruefe_eingabe();
	}
	else if (e.key=="(" && eingabe.selectionStart == eingabe.selectionEnd && eingabe.selectionStart == eingabe.value.length) {
		eingabe.value += ")";
		eingabe.selectionStart = eingabe.selectionEnd = eingabe.value.length-1;
	}
}

function antwort_anpassen(antwort){
	return trim(antwort).replaceAll("jemand","jmd") // Deutsch
		.replaceAll("jemanden","jmd")
		.replaceAll("jemandem","jmd")
		.replaceAll("jmd.","jmd")
		.replaceAll("jnd.","jmd")
		.replaceAll("etwas","etw")
		.replaceAll("\u00df","ss")
		.replaceAll("sb.","sb") // English
		.replaceAll("somebody","sb")
		.replaceAll("sb's","sbs")
		.replaceAll("sth.","sth")
		.replaceAll("something","sth")
		.replaceAll(/^to /g,"")
		.replaceAll("qn.","qn") // Franzoesisch
		.replaceAll("qc.","qc")
		.replaceAll("gen.","gen") // Latein
		.replaceAll("genitiv","gen")
		.replaceAll("dat.","dat")
		.replaceAll("dativ","dat")
		.replaceAll("akk.","akk")
		.replaceAll("akkusativ","akk")
		.replaceAll("abl.","abl")
		.replaceAll("ablativ","abl")
		.replaceAll("\u0101","a")
		.replaceAll("\u0113","e")
		.replaceAll("\u012b","i")
		.replaceAll("\u014d","o")
		.replaceAll("\u016b","u")
		/*.replaceAll("\u0100","A")
		.replaceAll("\u0102","A")
		.replaceAll("\u0103","a")
		.replaceAll("\u0112","E")
		.replaceAll("\u0114","E")
		.replaceAll("\u0115","e")
		.replaceAll("\u012a","I")
		.replaceAll("\u012c","I")
		.replaceAll("\u012d","i")
		.replaceAll("\u014c","O")
		.replaceAll("\u014e","O")
		.replaceAll("\u014f","o")
		.replaceAll("\u016a","U")
		.replaceAll("\u016c","U")
		.replaceAll("\u016d","u")*/
		.replaceAll("…","...")
		/*.replaceAll(";","/") // Trennzeichen
		.replaceAll(",","/")
		.replaceAll(" /","/")
		.replaceAll("/ ","/")*/
		.replaceAll(","," ")   // Trennzeichen ignorieren
		.replaceAll(";"," ")
		.replaceAll("/"," ")
		.replaceAll("  "," ") // Leerschlag reicht
		.replaceAll("  "," ")
		.replaceAll("„","'")
		.replaceAll("“","'")
		.replaceAll("\"","'")
		.replaceAll("`","'")
		.replaceAll("‘","'");
}

function input_correct(input=eingabe.value){
	loesung = antwort_anpassen(get_gefragtes(get_frage()));
	gegebene_antwort = antwort_anpassen(input);
	if (loesung.replaceAll("(","").replaceAll(")","") == 
	gegebene_antwort.replaceAll("(","").replaceAll(")","")) {
		return true;
	}
	else if (matches_ignore_brackets(loesung, gegebene_antwort)) {
		return true;
	}
	return false;
}

function matches_ignore_brackets(loesung, gegebene_antwort) {
	try {
		if (count_occurrences(loesung, "(") != count_occurrences(loesung, ")")) return loesung==gegebene_antwort;
		let pattern = RegExp("^ *"
			+ escape_regex(loesung)
			  .replaceAll(/( ?)\\\(([^\\]*)\\\)/g, "($1\\(?$2\\)?)?")
			+ " *$");
		// console.log(pattern);
		return pattern.exec("       " + gegebene_antwort) != null;
	}
	catch {
        return false;
	}
}

function pruefe_eingabe(pressed_a_key=false){
	if (beantwortet) {
		if (pressed_a_key) {
			// "Antwort war richtig"
			check_for_knacknuss();
			naechste_frage();
		}
		else {
			// Naechste Frage
			wiederholen();
			naechste_frage();
		}
		return;
	}

	beantwortet = true;
	eingabe.value = remove_trailing_spaces(eingabe.value);
	
	
	if (input_correct()){
		//eingabe.classList.add("correct");
		//document.getElementById("eingabeaufforderung").innerHTML = "Richtig!";
		
		check_for_knacknuss();
		naechste_frage();
	}
	else{
		let is_empty = trim(eingabe.value) == "";
		if (!is_empty) eingabe.classList.add("incorrect");
		fade_text(
			document.getElementById("eingabeaufforderung"),
			(is_empty ? "" : "Falsch. ") + "Richtig wäre: <b class='break_on_mobile'>" + get_gefragtes(get_frage()) + "</b>"
		);
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
	else erledigte.push(aufgabe);
}

function wiederholen(){
	aufgabe = aufgaben[aufgabe_index];
	aufgaben.splice(aufgabe_index + REPEAT_INTERVAL + 1, 0, aufgabe);
	if (knacknuesse.indexOf(aufgabe) != -1){
		knacknuesse.splice(knacknuesse.indexOf(aufgabe), 1);
		// Repetition of difficult word
	}
	if (nicht_sofort_klar.indexOf(aufgabe) == -1){
		nicht_sofort_klar.push(aufgabe);
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
		knacknuesse_string += liste.fragen[knacknuesse[i]][frage_attribut] + " &ndash; " + get_gefragtes(liste.fragen[knacknuesse[i]]) + "<br>";
	}
	return knacknuesse_string.substring(0, knacknuesse_string.length - 4);
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
	document.getElementById("fragestellung").innerHTML = "<b>FERTIG! " + String(liste.fragen.length) + " Wörter gelernt!</b>";
	if (knacknuesse.length == 0){
		document.getElementById("eingabeaufforderung").innerHTML = "Diese W\u00f6rter sitzen.<br>";
	}
	else if (knacknuesse.length == 1){
		document.getElementById("eingabeaufforderung").innerHTML = "Gut gemacht.<br>" +
		"Nur <i>" + get_knacknuesse() + "</i> war knifflig.<br>";
	}
	else{
		document.getElementById("eingabeaufforderung").innerHTML = "Geschafft!<br>" +
		Math.round(100 * (1 - (knacknuesse.length / liste.fragen.length))) + "% sitzen.<br>";
		
		//download_schwierige_button.hidden = false;
	}

    document.getElementById("eingabeaufforderung").innerHTML += "<a href='" + remove_parameter_from_url("progress") + "'>Alle nochmal lernen</a><br>";

	if (nicht_sofort_klar.length > 0) {
	    document.getElementById("eingabeaufforderung").innerHTML +=
	    "<a href='" + get_fortschritt_url((frage_nr)=>{return nicht_sofort_klar.indexOf(frage_nr)==-1}) +
	    "'>Nicht sofort gewusste lernen (" + format_fragenzahl(nicht_sofort_klar.length) + ")</a><br>";
	}
	if (knacknuesse.length > 1) {
		document.getElementById("eingabeaufforderung").innerHTML +="<a href='" + get_fortschritt_url((frage_nr)=>{return knacknuesse.indexOf(frage_nr)==-1}) +
		"'>Erst nach " + (MAX_UNTIL_KNACKNUSS + 1) + " oder mehr Versuchen gewusste lernen (" + format_fragenzahl(knacknuesse.length) + ")</a><br>" +
		"Das sind:<br>" +
		"<i>" + get_knacknuesse() + "</i>";
	}
	document.getElementById("fortschritt_kopieren_button").remove();
	eingabe.remove();
	
}

function format_fragenzahl(i) {
    return (i==liste.fragen.length ? "Alle " : "") + i + (i==1 ? " Frage" : " Fragen");
}

function remove_parameter_from_url(parameter, url=window.location.href) {
    return url.replace(RegExp("&" + escape_regex(parameter) +"=[^\\&]+"), "");
}

function get_url_with_parameter(parameter, value, url=window.location.href) {
	return remove_parameter_from_url(parameter, url) + "&" + parameter + "=" + value;
}

function fortschritt_kopieren() {
	navigator.clipboard.writeText(get_fortschritt_url());
}

function get_fortschritt_url(ist_gelernt=(frage_nr)=>{return erledigte.indexOf(frage_nr) != -1;}) {
	let gelernt = [];
	for (i in liste.fragen) {
		gelernt.push(ist_gelernt(i));
	}
	return get_url_with_parameter("progress", booleans_to_base64url(gelernt));
}

function frage_attribut_tauschen_moeglich() {	
    let neues_frage_attribut = get_gefragtes_attribut();
	for (frage of liste.fragen) {
		if (!frage[neues_frage_attribut]) return false;
	}
	return true;
}

function frage_attribut_tauschen() {
	if (!frage_attribut_tauschen_moeglich()) return; // Currently not an issue
    window.location.href = get_url_with_parameter(
		"askwith",
		encodeURIComponent(get_gefragtes_attribut()),
		remove_parameter_from_url("progress"));
}
