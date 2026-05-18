#!/usr/bin/env python3
"""Erzeugt data/seed.json aus einer Python-Liste — vermeidet JSON-Quote-Probleme."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "seed.json"

QUESTIONS = [
    # ---------- Stufe 1: 50 € ----------
    (1, "Wie viele Beine hat eine Spinne?", ["6", "8", "10", "4"], 1, "Tiere"),
    (1, "Welche Farbe entsteht, wenn man Blau und Gelb mischt?", ["Orange", "Lila", "Grün", "Braun"], 2, "Allgemein"),
    (1, "Wie heißt die Hauptstadt von Deutschland?", ["München", "Berlin", "Hamburg", "Köln"], 1, "Geografie"),
    (1, "In welchem Monat beginnt der Frühling?", ["Februar", "März", "April", "Mai"], 1, "Allgemein"),
    (1, "Welches Tier hält Winterschlaf?", ["Bär", "Fuchs", "Wolf", "Hase"], 0, "Tiere"),

    # ---------- Stufe 2: 100 € ----------
    (2, "Wie viele Bundesländer hat Deutschland?", ["14", "15", "16", "17"], 2, "Politik"),
    (2, "Welches Instrument hat 88 Tasten?", ["Akkordeon", "Klavier", "Orgel", "Cembalo"], 1, "Musik"),
    (2, "Wie heißt der größte Ozean der Erde?", ["Atlantik", "Pazifik", "Indischer Ozean", "Arktischer Ozean"], 1, "Geografie"),
    (2, "Welche Form hat eine klassische Pizza?", ["Quadratisch", "Rechteckig", "Rund", "Dreieckig"], 2, "Essen"),
    (2, "Wie viele Spieler hat eine Fußballmannschaft auf dem Feld?", ["10", "11", "12", "9"], 1, "Sport"),

    # ---------- Stufe 3: 200 € ----------
    (3, "Welcher Planet ist der Sonne am nächsten?", ["Venus", "Mars", "Merkur", "Erde"], 2, "Astronomie"),
    (3, "Wer schrieb das Theaterstück Faust?", ["Schiller", "Goethe", "Lessing", "Heine"], 1, "Literatur"),
    (3, "Welcher ist der längste Knochen im menschlichen Körper?", ["Schienbein", "Oberschenkelknochen", "Elle", "Wirbelsäule"], 1, "Biologie"),
    (3, "In welchem Land steht der Eiffelturm?", ["Italien", "Frankreich", "Spanien", "Belgien"], 1, "Geografie"),
    (3, "Wie nennt man die Wissenschaft der Pflanzen?", ["Zoologie", "Geologie", "Botanik", "Ökologie"], 2, "Biologie"),

    # ---------- Stufe 4: 300 € ----------
    (4, "Welche Währung wird in Schweden verwendet?", ["Euro", "Krone", "Franken", "Pfund"], 1, "Wirtschaft"),
    (4, "Welcher Fluss fließt durch Wien?", ["Rhein", "Donau", "Elbe", "Main"], 1, "Geografie"),
    (4, "Wie hieß der erste Mensch auf dem Mond?", ["Buzz Aldrin", "Neil Armstrong", "Juri Gagarin", "Michael Collins"], 1, "Geschichte"),
    (4, "Welche Sportart wird mit einem Shuttlecock gespielt?", ["Tennis", "Squash", "Badminton", "Tischtennis"], 2, "Sport"),
    (4, "Wie viele Saiten hat eine Standard-Gitarre?", ["4", "5", "6", "7"], 2, "Musik"),

    # ---------- Stufe 5: 500 € (Sicherheitsstufe) ----------
    (5, "In welchem Jahr fiel die Berliner Mauer?", ["1987", "1989", "1990", "1991"], 1, "Geschichte"),
    (5, "Welches chemische Element hat das Symbol Au?", ["Silber", "Gold", "Aluminium", "Argon"], 1, "Chemie"),
    (5, "Wie heißt die größte heiße Wüste der Welt?", ["Gobi", "Kalahari", "Sahara", "Atacama"], 2, "Geografie"),
    (5, "Welcher Künstler malte die Mona Lisa?", ["Michelangelo", "Raffael", "Leonardo da Vinci", "Botticelli"], 2, "Kunst"),
    (5, "Welches Spiel wird mit einem Brett aus 64 Feldern gespielt?", ["Dame", "Schach", "Backgammon", "Mühle"], 1, "Spiele"),

    # ---------- Stufe 6: 1.000 € ----------
    (6, "Wer schrieb den Roman Die Verwandlung?", ["Hermann Hesse", "Franz Kafka", "Thomas Mann", "Stefan Zweig"], 1, "Literatur"),
    (6, "Wie viele Knochen hat ein erwachsener Mensch ungefähr?", ["186", "206", "256", "306"], 1, "Biologie"),
    (6, "Welche Stadt war Gastgeber der Olympischen Sommerspiele 1972?", ["Berlin", "München", "Frankfurt", "Hamburg"], 1, "Sport"),
    (6, "In welchem US-Bundesstaat liegt Hollywood?", ["New York", "Texas", "Kalifornien", "Florida"], 2, "Geografie"),
    (6, "Welches Tier kann seinen Kopf um fast 270 Grad drehen?", ["Chamäleon", "Eule", "Schlange", "Fledermaus"], 1, "Tiere"),

    # ---------- Stufe 7: 2.000 € ----------
    (7, "Wer komponierte die Mondscheinsonate?", ["Mozart", "Bach", "Beethoven", "Schubert"], 2, "Musik"),
    (7, "Welches Land hat die meisten Einwohner?", ["China", "Indien", "USA", "Indonesien"], 1, "Geografie"),
    (7, "Was bedeutet die Abkürzung URL?", ["Universal Resource Link", "Uniform Resource Locator", "Unified Routing Layer", "User Reference Line"], 1, "Technik"),
    (7, "Welcher deutsche Physiker formulierte das Unschärfeprinzip?", ["Einstein", "Planck", "Heisenberg", "Schrödinger"], 2, "Wissenschaft"),
    (7, "Welche Hauptstadt liegt am Bosporus?", ["Athen", "Istanbul", "Sofia", "Bukarest"], 1, "Geografie"),

    # ---------- Stufe 8: 4.000 € ----------
    (8, "Welcher römische Kaiser ließ Rom angeblich brennen?", ["Caesar", "Augustus", "Nero", "Caligula"], 2, "Geschichte"),
    (8, "In welcher Stadt steht die Hagia Sophia?", ["Athen", "Kairo", "Istanbul", "Damaskus"], 2, "Geografie"),
    (8, "Welches Element wird durch das Symbol K dargestellt?", ["Kohlenstoff", "Kalium", "Krypton", "Kalzium"], 1, "Chemie"),
    (8, "Wer schrieb den Roman Der Steppenwolf?", ["Bertolt Brecht", "Hermann Hesse", "Heinrich Böll", "Günter Grass"], 1, "Literatur"),
    (8, "Welches Symbol findet sich auf der Flagge Kanadas?", ["Eichenblatt", "Ahornblatt", "Birkenblatt", "Tannenzweig"], 1, "Geografie"),

    # ---------- Stufe 9: 8.000 € ----------
    (9, "Welcher Philosoph wurde wegen Verführung der Jugend zum Tod verurteilt?", ["Platon", "Aristoteles", "Sokrates", "Epikur"], 2, "Philosophie"),
    (9, "Welcher Stoff besteht aus Wasserstoff und Sauerstoff?", ["Salz", "Wasser", "Ammoniak", "Methan"], 1, "Chemie"),
    (9, "Wer schrieb Die Blechtrommel?", ["Heinrich Böll", "Günter Grass", "Siegfried Lenz", "Martin Walser"], 1, "Literatur"),
    (9, "Wie heißt das längste Gebirge der Welt?", ["Himalaya", "Rocky Mountains", "Anden", "Alpen"], 2, "Geografie"),
    (9, "In welcher Sprache wurde das Neue Testament ursprünglich verfasst?", ["Hebräisch", "Lateinisch", "Griechisch", "Aramäisch"], 2, "Religion"),

    # ---------- Stufe 10: 16.000 € (Sicherheitsstufe) ----------
    (10, "Welcher Komponist schrieb die Zauberflöte?", ["Haydn", "Mozart", "Mahler", "Strauß"], 1, "Musik"),
    (10, "Welche Einheit misst elektrischen Widerstand?", ["Volt", "Ampere", "Ohm", "Watt"], 2, "Physik"),
    (10, "Welcher französische Maler ist für Seerosen-Bilder bekannt?", ["Renoir", "Cézanne", "Monet", "Degas"], 2, "Kunst"),
    (10, "Welche Sprache hat die meisten Muttersprachler weltweit?", ["Englisch", "Spanisch", "Mandarin-Chinesisch", "Hindi"], 2, "Sprache"),
    (10, "Welche Inselgruppe entdeckte Kolumbus 1492 zuerst?", ["Indien", "die Bahamas", "Brasilien", "Mexiko"], 1, "Geschichte"),

    # ---------- Stufe 11: 32.000 € ----------
    (11, "Wer schrieb Also sprach Zarathustra?", ["Schopenhauer", "Kant", "Hegel", "Nietzsche"], 3, "Philosophie"),
    (11, "Welche Eisenbahnstrecke verbindet Moskau mit Wladiwostok?", ["Sibirische Magistrale", "Transsibirische Eisenbahn", "Polarexpress", "Eurasia-Linie"], 1, "Geografie"),
    (11, "Wie heißt der römische Kriegsgott?", ["Jupiter", "Neptun", "Mars", "Merkur"], 2, "Mythologie"),
    (11, "Welcher Maler schnitt sich angeblich ein Ohr ab?", ["Gauguin", "van Gogh", "Cézanne", "Toulouse-Lautrec"], 1, "Kunst"),
    (11, "Welche Hauptstadt liegt auf zwei Kontinenten?", ["Kairo", "Istanbul", "Moskau", "Athen"], 1, "Geografie"),

    # ---------- Stufe 12: 64.000 € ----------
    (12, "Was bedeutet das lateinische carpe diem?", ["Nutze den Tag", "Ergreif die Sterne", "Folge dem Schicksal", "Glaube an Götter"], 0, "Sprache"),
    (12, "In welchem Jahr wurde die Bundesrepublik Deutschland gegründet?", ["1945", "1949", "1955", "1961"], 1, "Geschichte"),
    (12, "Wer war der erste deutsche Bundeskanzler?", ["Willy Brandt", "Konrad Adenauer", "Helmut Kohl", "Ludwig Erhard"], 1, "Politik"),
    (12, "Welche chemische Verbindung wird als Lachgas bezeichnet?", ["NO", "NO₂", "N₂O", "N₂O₅"], 2, "Chemie"),
    (12, "Welcher japanische Regisseur drehte Die sieben Samurai?", ["Yasujirō Ozu", "Akira Kurosawa", "Hayao Miyazaki", "Kenji Mizoguchi"], 1, "Film"),

    # ---------- Stufe 13: 125.000 € ----------
    (13, "In welcher Stadt wurde Johann Sebastian Bach 1685 geboren?", ["Leipzig", "Eisenach", "Köthen", "Weimar"], 1, "Musik"),
    (13, "Welcher Begriff bezeichnet die Zerlegung von Licht in Spektralfarben durch ein Prisma?", ["Beugung", "Brechung", "Dispersion", "Reflexion"], 2, "Physik"),
    (13, "Welcher amerikanische Schriftsteller schrieb Der alte Mann und das Meer?", ["Steinbeck", "Hemingway", "Faulkner", "Fitzgerald"], 1, "Literatur"),
    (13, "Welcher Vertrag beendete offiziell den Ersten Weltkrieg?", ["Vertrag von Verdun", "Vertrag von Versailles", "Vertrag von Tilsit", "Vertrag von Rastatt"], 1, "Geschichte"),
    (13, "Was misst die Mohs-Skala?", ["Erdbebenstärke", "Härte von Mineralien", "Lautstärke", "Säuregehalt"], 1, "Wissenschaft"),

    # ---------- Stufe 14: 500.000 € ----------
    (14, "Welcher französische König wurde 1793 hingerichtet?", ["Ludwig XIV.", "Ludwig XV.", "Ludwig XVI.", "Ludwig XVIII."], 2, "Geschichte"),
    (14, "Welche Hauptstadt ist die höchstgelegene der Welt?", ["Quito", "La Paz", "Lhasa", "Bogotá"], 1, "Geografie"),
    (14, "Wer schrieb die Oper Tristan und Isolde?", ["Verdi", "Puccini", "Wagner", "Strauß"], 2, "Musik"),
    (14, "In welchem Jahr starb Albert Einstein?", ["1945", "1955", "1965", "1975"], 1, "Wissenschaft"),
    (14, "Welche römische Zahl entspricht 1984?", ["MCMLXXXIV", "MCMLXIV", "MDLXXXIV", "MCMXCIV"], 0, "Mathematik"),

    # ---------- Stufe 15: 1.000.000 € ----------
    (15, "Welcher Wissenschaftler erhielt 1921 den Nobelpreis für den photoelektrischen Effekt?", ["Bohr", "Einstein", "Planck", "Heisenberg"], 1, "Wissenschaft"),
    (15, "Welcher byzantinische Kaiser ließ den Codex Iustinianus zusammenstellen?", ["Konstantin I.", "Theodosius", "Justinian I.", "Heraklios"], 2, "Geschichte"),
    (15, "Wie heißt in der Astronomie der sonnennächste Punkt einer Planetenbahn?", ["Aphel", "Perihel", "Apogäum", "Perigäum"], 1, "Astronomie"),
    (15, "Wer schrieb das Gedicht Der Erlkönig?", ["Schiller", "Heine", "Goethe", "Lessing"], 2, "Literatur"),
    (15, "Welcher griechische Mathematiker formulierte das Parallelenpostulat?", ["Pythagoras", "Archimedes", "Thales", "Euklid"], 3, "Mathematik"),
]


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = [
        {"level": lvl, "q": q, "a": a, "correct": c, "category": cat}
        for (lvl, q, a, c, cat) in QUESTIONS
    ]
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Schrieb {len(payload)} Fragen → {OUT}")


if __name__ == "__main__":
    main()
