import { createBook, listBooks } from '@/lib/books/repository';
import { assignSubject, getOrCreateSubject } from '@/lib/subjects/repository';

// Source: the 15 July 2026 catalog PDF supplied for this import.
const CATALOG = `
Άτλαντες|DK Complete Atlas of the World|Dk|2016|Dorling Kindersley
Άτλαντες|The World Atlas of Coffee: From Beans to Brewing – Coffees Explored, Explained and Enjoyed|Hoffmann, James|2014|Mitchell Beazley
Άτλαντες|Compact World Atlas|Staff, Dorling Kindersley Publishing|2001|Dorling Kindersley
Αυτοβελτίωση|Βότανα - Φυσική Ιατρική 87 Βότανα και οι Θεραπευτικές τους Ιδιότητες||2004|Power Publishing
Αυτοβελτίωση|Atomic Habits: An Easy and Proven Way to Build Good Habits and Break Bad Ones : Tiny Changes, Remarkable Results|Clear, James|2018|Avery
Αυτοβελτίωση|Back to Basics: A Complete Guide to Traditional Skills|Gehring, Abigail|2008|Skyhorse Publishing
Αυτοβελτίωση|The Leader Habit: Master the Skills You Need to Lead–In Just Minutes a Day|Lanik, Martin|2018|AMACOM
Αυτοβελτίωση|Οδηγός Επιβίωσης SAS|Lofty Wiseman|1986|HarperCollins
Αυτοβελτίωση|Όταν το Σώμα λέει Όχι|Maté, Gabor|2003|Keybooks
Αυτοβελτίωση|Φυσική θεραπεία: Ο ιατρικός οδηγός της σύγχρονης φυσικοπαθητικής επιστήμης|Michalsen, Andreas|2021|Πατάκη
Μαγειρική|Φοιτητής και στη Κουζίνα|Βίκυ Σμούρλη|1999|Πεδίο
Μαγειρική|Το Απόλυτο Βιβλίο της Νηστείας|Πετρετζίκης, Άκης|2021|Ψυχογιός
Μαγειρική|Μεσογειακή Κουζίνα|Various||
Επική Φαντασία|The Goblin Emperor|Addison, Katherine|2014|Tor Books
Επική Φαντασία|Imajica|Barker, Clive|1991|HarperCollins
Επική Φαντασία|The Letters of J. R. R. Tolkien|Carpenter, Tolkien J. R. R., Christopher Tolkien|1981|George Allen & Unwin
Επική Φαντασία|The Atlas of Middle-Earth|Fonstad, Karen Wynn|1981|Houghton Mifflin
Επική Φαντασία|Ο Δράκος του Πάγου|Martin, George R. R.|2015|Μεταίχμιο
Επική Φαντασία|Το Τραγούδι της Φωτιάς και του Πάγου 1: Παιχνίδι του Στέμματος|Martin, George R. R.|2013|Anubis
Επική Φαντασία|Το Τραγούδι της Φωτιάς και του Πάγου 2: Σύγκρουση Βασιλέων|Martin, George R. R.|2013|Anubis
Επική Φαντασία|Το Τραγούδι της Φωτιάς και του Πάγου 3: Θύελλα από Ατσάλι, Α’ Τόμος|Martin, George R. R.|2011|Anubis
Επική Φαντασία|Το Τραγούδι της Φωτιάς και του Πάγου 3: Θύελλα από Ατσάλι, Β’ Τόμος|Martin, George R. R.|2011|Anubis
Επική Φαντασία|Το Τραγούδι της Φωτιάς και του Πάγου 4: Βορά Ορνίων|Martin, George R. R.|2011|Anubis
Επική Φαντασία|Το Τραγούδι της Φωτιάς και του Πάγου 5: Ο Χορός των Δράκων, Α’ Τόμος: Το Κάλεσμα της Φλόγας|Martin, George R. R.|2011|Anubis
Επική Φαντασία|Το Τραγούδι της Φωτιάς και του Πάγου 5: Ο Χορός των Δράκων, Β’ Τόμος: Το Σπαθί στο Σκοτάδι|Martin, George R. R.|2011|Anubis
Επική Φαντασία|Η τριλογία του κόσμου 1: Το Αστέρι του Βορρά|Pullman, Philip||Ψυχογιός
Επική Φαντασία|Η τριλογία του κόσμου 2: Ο Άρχοντας των Δύο Κόσμων|Pullman, Philip|2019|Ψυχογιός
Επική Φαντασία|Η τριλογία του κόσμου 3: Το Κεχριμπάρενιο Τηλεσκόπιο|Pullman, Philip|2002|Ψυχογιός
Επική Φαντασία|Ο Άρχοντας των Δαχτυλιδιών 1: Η Συντροφιά του Δαχτυλιδιού|Tolkien, J. R. R.|1985|Κέδρος
Επική Φαντασία|Ο Άρχοντας των Δαχτυλιδιών 2: Οι Δύο Πύργοι|Tolkien, J. R. R.|1985|Κέδρος
Επική Φαντασία|Ο Άρχοντας των Δαχτυλιδιών 3: Η Επιστροφή του Βασιλιά|Tolkien, J. R. R.|1985|Κέδρος
Επική Φαντασία|Σιλμαρίλλιον|Tolkien, J. R. R.|1996|Αίολος
Επική Φαντασία|Χόμπιτ|Tolkien, J. R. R.|1978|Κέδρος
Επική Φαντασία|Bilbo’s Last Song|Tolkien, J. R. R.|1974|George Allen & Unwin
Επική Φαντασία|Tales From the Perilous Realm|Tolkien, J. R. R.|1997|George Allen & Unwin
Επική Φαντασία|The Book of Lost Tales: Part 2|Tolkien, J. R. R.|1984|George Allen & Unwin
Επική Φαντασία|The Children of Húrin|Tolkien, J. R. R.|2007|HarperCollins
Επική Φαντασία|The Hobbit|Tolkien, J. R. R.|1937|George Allen & Unwin
Επική Φαντασία|The Hobbit (Enhanced Edition)|Tolkien, J. R. R.|1937|George Allen & Unwin
Επική Φαντασία|The Legend of Sigurd and Gudrún|Tolkien, J. R. R.|2009|HarperCollins
Επική Φαντασία|The Lord of the Rings: The Fellowship of the Ring, the Two Towers, the Return of the King|Tolkien, J. R. R.|1954|George Allen & Unwin
Επική Φαντασία|The Silmarillion|Tolkien, J. R. R.|1977|George Allen & Unwin
Επική Φαντασία|Unfinished Tales|Tolkien, J. R. R.|1980|George Allen & Unwin
Επιστήμη|Η Φυσική Σήμερα|Οικονόμου, Ηλίας||
Επιστήμη|Popular Mechanics the Big Little Book of Awesome Stuff: 300 Wild Facts, Fun Projects and Amazing Tricks|Bova, Dan|2023|Hearst Home Kids
Επιστήμη|Head First Design Patterns|Freeman, Eric|2004|O’Reilly Media
Επιστήμη|Database Systems|Garcia-Molina, Hector|2002|Prentice Hall
Επιστημονική Φαντασία|Το Ρεστόραν στο Τέλος του Σύμπαντος|Adams, Douglas|2022|Μίνωας
Επιστημονική Φαντασία|Γαλαξιακή Αυτοκρατορία 1|Asimov, Isaac|1984|Κάκτος
Επιστημονική Φαντασία|Γαλαξιακή Αυτοκρατορία 2|Asimov, Isaac|1978|Κάκτος
Επιστημονική Φαντασία|Γαλαξιακή Αυτοκρατορία 3|Asimov, Isaac||Κάκτος
Επιστημονική Φαντασία|Γαλαξιακή Αυτοκρατορία 4|Asimov, Isaac|2023|Κάκτος
Επιστημονική Φαντασία|Γαλαξιακή Αυτοκρατορία 5|Asimov, Isaac|2023|Κάκτος
Επιστημονική Φαντασία|Γαλαξιακή Αυτοκρατορία 6|Asimov, Isaac|2023|Κάκτος
Επιστημονική Φαντασία|Νευρομάντης|Gibson, William|1998|Αίολος
Ιστορία|Γιατί το Βυζάντιο|Αρβελέρ, Ελένη Γλύκαντζη|2012|Μεταίχμιο
Ιστορία|Συνοπτική Ιστορία των Κυθήρων|Καλλίγερος, Εμμανουήλ Π.|1996|Κυθηραϊκά
Ιστορία|Μικρασιατική Εκστρατεία|Καργάκος, Σαράντος|2009|Ιδιωτική Έκδοση
Ιστορία|Θράκη – Κωνσταντινούπολη|Λαμπάκη, Το οδοιπορικό του Γεωργίου|2007|Βυζαντινό και Χριστιανικό Μουσείο
Ιστορία|Χωρά όλη η αρχαιότητα στο ασανσέρ|Παπακώστας, Θεόδωρος|2021|Key Books
Ιστορία|Οι Λαοί της Ευρώπης, Καταγωγή και Χαρακτηριστικά|Ραφαηλίδης, Βασίλης|1996|Εκδόσεις του Εικοστού Πρώτου
Ιστορία|Οι λαοί των Βαλκανίων|Ραφαηλίδης, Βασίλης|1994|Εκδόσεις του Εικοστού Πρώτου
Ιστορία|Βιβλικά Χαμόγελα|Τσιφόρος, Νίκος|1980|Ερμής
Ιστορία|Ελληνική Κρουαζιέρα|Τσιφόρος, Νίκος|1975|Ερμής
Ιστορία|Εμείς και οι Φράγκοι|Τσιφόρος, Νίκος|1978|Ερμής
Ιστορία|Η Ιστορία της Αθήνας|Τσιφόρος, Νίκος|1982|Ερμής
Ιστορία|Σταυροφορίες|Τσιφόρος, Νίκος|1977|Ερμής
Ιστορία|Σκύρος|Φαλταΐτς, Μάνος||
Ιστορία|The Boundless Sea: A Human History of the Oceans|Abulafia, David|2019|Oxford University Press
Ιστορία|Βυζάντιο, η γέφυρα από την αρχαιότητα στον Μεσαίωνα|Angold, Michael J.|2003|Λιβάνης
Ιστορία|The Birth of the Modern World, 1780-1914|Bayly, C. A.|2004|Blackwell Publishing
Ιστορία|The Greeks: A Global History|Beaton, Roderick|2021|Faber & Faber
Ιστορία|Ιστορία των Ηνωμένων Πολιτειών, Μια Σύντομη Εισαγωγή|Boyer, Paul|2012|Θύραθεν
Ιστορία|Popular Culture in Early Modern Europe|Burke, Peter|2009|Ashgate
Ιστορία|Early Modern Europe - An Oxford History|Cameron, Euan|2001|Oxford University Press
Ιστορία|Οι Σπαρτιάτες|Cartledge, Paul|2004|Λιβάνης
Ιστορία|Ο Β’ Παγκόσμιος Πόλεμος|Churchill, Winston||Το Βήμα
Ιστορία|Συνοπτική Ιστορία της Ελλάδας|Clogg, Richard|2003|Κάτοπτρο
Ιστορία|Unfinished Empire: The Global Expansion of Britain|Darwin, John|2013|Bloomsbury Press
Ιστορία|Ιστορία της Μεσαιωνικής Ευρώπης: Από τον Μέγα Κωνσταντίνο στον Άγιο Λουδοβίκο|Davis, R. H. C.|2011|Κριτική
Ιστορία|Έθνη σε Αναταραχή|Diamond, Jared|2020|Διόπτρα
Ιστορία|Ιστορία του Σύγχρονου Ευρωπαϊκού Πολιτισμού|Eco, Umberto|2022|Το Βήμα
Ιστορία|Ο πόλεμος στον κόσμο / Ο αιώνας του μίσους 1901-2000|Ferguson, Niall|2006|Το Βήμα
Ιστορία|Civilizations: Culture, Ambition, and the Transformation of Nature|Fernández-Armesto, Felipe|2000|Free Press
Ιστορία|Our America: A Hispanic History of the United States|Fernández-Armesto, Felipe|2014|W. W. Norton
Ιστορία|The Oxford History of the World|Fernández-Armesto, Felipe|2019|Oxford University Press
Ιστορία|Prophets, Profits, and Peace: The Positive Role of Business in Promoting Religious Tolerance|Fort, Timothy L.|2008|Yale University Press
Ιστορία|The Silk Roads: A New History of the World|Frankopan, Peter|2015|Bloomsbury
Ιστορία|A Concise History of Germany|Fulbrook, Mary|2019|University College London
Ιστορία|Μικρή Ιστορία της Ρωσίας|Galeotti, Mark|2022|Πατάκης
Ιστορία|Μικρή Ιστορία του Κόσμου|Gombrich, E. H.|2007|Πατάκης
Ιστορία|Homo Deus: Μια σύντομη ιστορία του μέλλοντος|Harari, Yuval Noah|2017|Αλεξάνδρεια
Ιστορία|Sapiens: A Brief History of Humankind|Harari, Yuval Noah|2014|Harvill Secker
Ιστορία|Σύντομη ιστορία της Ευρώπης|Hirst, John|2022|Μεταίχμιο
Ιστορία|The Venture of Islam, Volume 1: The Classical Age of Islam|Hodgson, Marshall G. S.|1974|University of Chicago Press
Ιστορία|The Venture of Islam, Volume 2: The Expansion of Islam in the Middle Periods|Hodgson, Marshall G. S.|1974|University of Chicago Press
Ιστορία|The Venture of Islam, Volume 3: The Gunpower Empires and Modern Times|Hodgson, Marshall G. S.|1974|University of Chicago Press
Ιστορία|Η Ιστορία του Αραβικού Κόσμου|Hourani, Albert|2012|Ψυχογιός
Ιστορία|Σύντομη ιστορία της Κίνας|Jaivin, Linda|2022|Μεταίχμιο
Ιστορία|A Brief History of France|Jenkins, Cecil|2011|Robinson
Ιστορία|The Templars|Jones, Dan|2017|Head of Zeus
Ιστορία|In the Shadow of the Gods: The Emperor in World History|Lieven, Dominic|2022|Allen Lane
Ιστορία|Οι Σταυροφορίες από τη Σκοπιά των Αράβων|Maalouf, Amin|1983|Λιβάνης – Νέα Σύνορα
Ιστορία|Οι Έλληνες της Δύσης|Manfredi, Valerio M.|1997|Λιβάνης
Ιστορία|Ιστορία της Αρχαίας Ελλάδας: Από την προϊστορία στους Ελληνιστικούς Χρόνους|Martin, Thomas R.|2023|Θύραθεν
Ιστορία|S.P.Q.R. Ιστορία της Αρχαίας Ρώμης|Mary Beard|2015|Αλεξάνδρεια
Ιστορία|Η Ελληνική Επανάσταση|Mazower, Mark|2021|Αλεξάνδρεια
Ιστορία|Σκοτεινή Ήπειρος|Mazower, Mark|2001|Αλεξάνδρεια
Ιστορία|On Antisemitism: A Word in History|Mazower, Mark|2025|Penguin Press
Ιστορία|Η εποχή του λυκόφωτος: Η καταστροφή του κλασικού κόσμου από τον Χριστιανισμό|Nixey, Catherine|2022|Αλεξάνδρεια
Ιστορία|Οι Έλληνες πριν τους Οθωμανούς: Ο εθνισμός στο ύστερο Βυζάντιο|Page, Gill|2014|Θύραθεν
Ιστορία|Οι Πόλεις του Μεσαίωνα|Pirenne, Henri|2003|Βιβλιόραμα
Ιστορία|Venice: The Remarkable History of the Lagoon City|Romano, Dennis|2024|Oxford University Press
Ιστορία|The Age of Choice: A History of Freedom in Modern Life|Rosenfeld, Sophia|2025|Princeton University Press
Ιστορία|Βυζαντινός Πολιτισμός|Runciman, Steven|2017|Μεταίχμιο
Ιστορία|Η Άλωση της Κωνσταντινούπολης|Runciman, Steven|2005|Παπαδήμας
Ιστορία|Η Ιστορία των Σταυροφοριών|Runciman, Steven|2006|Γκοβόστης
Ιστορία|A History of the Greek City States, Ca. 700-338 B.C.|Sealey, Raphael|1976|University of California Press
Ιστορία|Ο Θάνατος του Αρχαίου Κόσμου|Smith, John Holland|2012|Θύραθεν
Ιστορία|Συνοπτική Ιστορία του Δευτέρου Παγκοσμίου Πολέμου|Stone, Norman|2013|Ψυχογιός
Ιστορία|Συνοπτική Ιστορία του Πρώτου Παγκοσμίου Πολέμου|Stone, Norman|2010|Ψυχογιός
Ιστορία|Religion and the Decline of Magic: Studies in Popular Beliefs in Sixteenth and Seventeenth-Century England|Thomas, Keith|1971|Weidenfeld & Nicolson
Ιστορία|Topography of Terror|Topography of Terror Foundation|2010|Stiftung Topographie des Terrors
Ιστορία|A Concise History of Byzantium|Treadgold, Warren|2001|Palgrave Macmillan
Ιστορία|The Albanians: A Modern History|Vickers, Miranda|1995|I.B. Tauris
Ιστορία|Ξενοφών. Η Κάθοδος των Μυρίων|Waterfield, Robin|2007|Ψυχογιός
Ιστορία|The Inheritance of Rome: Illuminating the Dark Ages 400-1000|Wickham, Chris|2009|Allen Lane
Ιστορία|A People’s History of the United States|Zinn, Howard|1980|Harper & Row
Ιστορία|Οι γνωστικοί και ο αρχέγονος χριστιανισμός: Η θεολογία του ουράνιου ανθρώπου|Κούτουλας, Διαμαντής Κ.|2006|Δίον
Ιστορία|Μετά τον Ταμερλάνο: Η Άνοδος και Πτώση των Παγκοσμίων Αυτοκρατοριών 1400–2000|Darwin, John|2021|Πατάκης
Ιστορία|Οι Δρόμοι του Μεταξιού: Μια Νέα Ιστορία του Κόσμου|Frankopan, Peter|2022|Αλεξάνδρεια
Ιστορία|Το Σύμπαν, οι Θεοί, οι Άνθρωποι: Ελληνικές Ιστορίες για τη Δημιουργία του Κόσμου|Vernant, Jean-Pierre|2013|Πατάκης
Ιστορία|Μικρή ιστορία της Γερμανίας|Hawes, James|2019|Πατάκης
Ιστορία|Η πιο Μικρή Ιστορία της Αγγλίας|Hawes, James|2026|Πατάκης
Ιστορία|Βυζάντιο: Μια Συνοπτική Ιστορία|Treadgold, Warren|2024|Πεδίο
Μουσική|Ο Ωκεανός του Ήχου: Αιθέριες συνομιλίες, περιβαλλοντικοί ήχοι και φανταστικοί κόσμοι|Toop, David|2003|Οξύ
Μυθιστόρημα|Η Φωνή|Χωμενίδης, Χρήστος|1998|Εστία
Μυθιστόρημα|Η Ιστορία του Χαλίφη Βατέκ|Beckford, William|1980|Γράμματα
Μυθιστόρημα|Ο Εικονογραφημένος Άνθρωπος|Bradbury, Ray|2021|Άγρα
Μυθιστόρημα|Κώδικας Da Vinci|Brown, Dan|2003|Doubleday
Μυθιστόρημα|Ο Λύκος της Στέππας|Hesse, Hermann|1927|S. Fischer Verlag
Μυθιστόρημα|Τα βουνά της τρέλας: Άπαντα 1|Lovecraft, H. P.|1990|Κάκτος
Μυθιστόρημα|Ο Τροπικός Του Καρκίνου|Miller, Henry|1934|Obelisk Press
Μυθιστόρημα|1984|Orwell, George|1949|Secker and Warburg
Μυθιστόρημα|Άνεμοι Πολέμου|Pressfield, Steven|2002|Πατάκης
Μυθιστόρημα|Οι Πύλες της Φωτιάς|Pressfield, Steven|1998|Doubleday
Μυθιστόρημα|Το ανθρώπινο στίγμα|Roth, Philip|2008|Πόλις
Μυθιστόρημα|Ο Βασιλιάς Πίθηκος|Wu Cheng’en|2025|Ατρείδων Κύκλος
Μυθολογία|Norse Mythology|Gaiman, Neil|2017|Bloomsbury
Πολιτική Επιστήμη|Το Αόρατο Ρήγμα: Θεσμοί και Συμπεριφορές στην Ελληνική Οικονομία|Δοξιάδης, Αρίστος|2013|Ίκαρος
Πολιτική Επιστήμη|Τουρκία, Ανατολικά της ΕΕ|Χατζηστεφάνου, Άρης|2005|Πολύτροπον
Πολιτική Επιστήμη|Το Τέλος της Ιστορίας και ο Τελευταίος Άνθρωπος|Fukuyama, Francis||Λιβάνης
Ταξιδιωτική Λογοτεχνία|Περπατώντας στην Αθήνα|Βατόπουλος, Νίκος|2018|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|Ένας οδηγός για την Πάτρα|Γούδη, Αλεξάνδρα|2024|Παράγραφος
Ταξιδιωτική Λογοτεχνία|Ταξιδεύοντας - Ιαπωνία-Κίνα|Καζαντζάκης, Νίκος|2024|Διόπτρα
Ταξιδιωτική Λογοτεχνία|Ταξιδεύοντας - Ισπανία|Καζαντζάκης, Νίκος|2022|Διόπτρα
Ταξιδιωτική Λογοτεχνία|Ταξιδεύοντας – Ιταλία-Αίγυπτος, Σινά-Ιερουσαλήμ, Κύπρος-ο Μοριάς|Καζαντζάκης, Νίκος|2022|Διόπτρα
Ταξιδιωτική Λογοτεχνία|Κωνσταντινούπολη, Μια Πόλη στη Λογοτεχνία|Ξανθούλης, Γιάννης|2004|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|City of Djinns|Dalrymple, William|1993|HarperCollins
Ταξιδιωτική Λογοτεχνία|Ταξίδι στη Σκιά του Βυζαντίου|Dalrymple, William|2019|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|Full Tilt: Ireland to India With a Bicycle|Dervla Murphy|1965|John Murray
Ταξιδιωτική Λογοτεχνία|Τα Ελληνικά Νησιά|Durrell, Lawrence|1978|Faber & Faber
Ταξιδιωτική Λογοτεχνία|Ατέλειωτος Δρόμος: Από τις Σιδηρές Πύλες του Δούναβη ως τον Άθω|Fermor, Patrick Leigh|2014|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|Η Πορεία προς την Κωνσταντινούπολη: Η Εποχή της Δωρεάς – Ανάμεσα στα Δάση και τα Νερά|Fermor, Patrick Leigh|2013|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|Καιρός του Σιγάν στη Σιωπή των Μοναστηριών: Βόρεια Γαλλία, Καππαδοκία|Fermor, Patrick Leigh|2022|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|Μάνη|Fermor, Patrick Leigh|2021|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|Ρούμελη|Fermor, Patrick Leigh|2020|Μεταίχμιο
Ταξιδιωτική Λογοτεχνία|The Traveller’s Tree: A Journey Through the Carribean Islands|Fermor, Patrick Leigh|1950|John Murray
Ταξιδιωτική Λογοτεχνία|Έβενος, Το Χρώμα της Αφρικής|Kapuscinski, Ryszard|2001|Penguin Books
Ταξιδιωτική Λογοτεχνία|Ο Γυρισμός του Ταξιδευτή|Kerouac, Jack|2007|Απόπειρα
Ταξιδιωτική Λογοτεχνία|Στην Ευρώπη: Ταξιδιωτική Λογοτεχνία στον 20ό αιώνα|Mak, Geert|2004|Uitgeverij Atlas
Ταξιδιωτική Λογοτεχνία|Το Μεγάλο Σιδηροδρομικό Παζάρι: Διασχίζοντας την Ασία με τρένο|Theroux, Paul||Κέδρος
Ταξιδιωτική Λογοτεχνία|The Old Patagonian Express: By Train Through the Americas|Theroux, Paul|1979|Houghton Mifflin
Ταξιδιωτική Λογοτεχνία|Arabian Sands|Thesiger, Wilfred|1959|Longmans
Τέχνη|Οδηγός για τους Μεγάλους Πίνακες Ζωγραφικής|Lodwick, Marcus|2004|Κοχλίας
Φιλοσοφία|Επίκουρος|Θεοδωρίδης, Χαράλαμπος|2008|Εστία
Φιλοσοφία|Γκέμμα|Λιαντίνης, Δημήτρης|1998|Βιβλιογονία
Φιλοσοφία|Λουκρήτιος, Περί Φύσεως|Λουκρήτιος|2021|Gutenberg
Φιλοσοφία|Η Αέναη Εφορία|Bruckner, Pascal|2001|Αστάρτη
Φιλοσοφία|The History of Philosophy|Grayling, A. C.|2019|Penguin Press
Φιλοσοφία|A Monk’s Guide to a Clean House and Mind|Matsumoto, Shoukei|2018|Penguin Books
Φιλοσοφία|Μάζες και Ελίτ στη Δημοκρατική Αθήνα: Ρητορική, Ιδεολογία και η Ισχύς του Λαού|Ober, Josiah|2003|Πολύτροπον
Φιλοσοφία|Στωικοί, Επικούρειοι και Σκεπτικοί|Sharples, R. W.|1996|Θύραθεν
Φωτογραφία|Εν Αιγίω Φωτογραφικό Υλικό 1900-1970|Μαυρουδής, Λ. & Τζεβελέκης, Δ.|2001|Αιγιαλειακό Πνευματικό Κέντρο
Φωτογραφία|Η Ελλάδα μετά τον Πόλεμο: Τα χρόνια της Ελπίδας|McCabe, Robert A.|2023|Πατάκης
Κλασική Γραμματεία|Επίκουρος Άπαντα|Επίκουρος|1994|Κάκτος
Κλασική Γραμματεία|Ορέστης|Ευριπίδης|2008|Πατάκη
Κλασική Γραμματεία|Θουκυδίδης Ιστορία|Θουκυδίδης|2019|Μεταίχμιο
Κλασική Γραμματεία|Ομήρου Ιλιάδα|Μαυρόπουλος, Θεόδωρος Γ.|2010|Ζήτρος
Κλασική Γραμματεία|Ομήρου Οδύσσεια|Μαυρόπουλος, Θεόδωρος Γ.|2010|Ζήτρος
RPG|Dragonbane Bestiary|Free League Publishing|2023|Free League Publishing
RPG|Dragonbane Core Set|Free League Publishing|2023|Free League Publishing
RPG|Dragonbane Rulebook|Free League Publishing|2023|Free League Publishing
RPG|Shadowdark Game Master Quickstart|The Arcane Library|2023|The Arcane Library
RPG|Shadowdark Player Quickstart|The Arcane Library|2023|The Arcane Library
RPG|Advanced Dungeons & Dragons Dungeon Master’s Guide|TSR|1989|TSR
RPG|Advanced Dungeons & Dragons Player’s Handbook|TSR|1989|TSR
Βιβλία που Θέλω|59,5 Χώρες και το Πιγκλού|Γεώργιζας, Παύλος|2024|Οσελότος
Βιβλία που Θέλω|Ταξιδεύοντας - Αγγλία|Καζαντζάκης, Νίκος|2025|Διόπτρα
Βιβλία που Θέλω|Ταξιδεύοντας - Ρουσία|Καζαντζάκης, Νίκος|2022|Διόπτρα
Βιβλία που Θέλω|Άραβες|Ραφαηλίδης, Βασίλης|2003|Εκδόσεις του Εικοστού Πρώτου
Βιβλία που Θέλω|Ιστορία Κωμικοτραγική του Νεοελληνικού Κράτους 1830–1974|Ραφαηλίδης, Βασίλης|2018|Εκδόσεις του Εικοστού Πρώτου
Βιβλία που Θέλω|Οι Λαοί της Μέσης Ανατολής|Ραφαηλίδης, Βασίλης|1998|Εκδόσεις του Εικοστού Πρώτου
Βιβλία που Θέλω|Η Μεγάλη Θάλασσα: Οι Περιπέτειες των Λαών της Μεσογείου|Abulafia, David|2012|Ψυχογιός
Βιβλία που Θέλω|Ελλάδα 1453–1821: Οι Άγνωστοι Αιώνες|Brewer, David|2018|Πατάκης
Βιβλία που Θέλω|Κατόπτρο: Όπλα, Μικρόβια και Ατσάλι|Diamond, Jared||ΔΟΜΟΣ
Βιβλία που Θέλω|Η Πρώτη Σταυροφορία: Το Κάλεσμα της Ανατολής|Frankopan, Peter|2019|Αλεξάνδρεια
Βιβλία που Θέλω|Το χρονικό της τέχνης|Gombrich, Ernst Hans|1998|Μορφωτικό Ίδρυμα Εθνικής Τραπέζης
Βιβλία που Θέλω|Η μαγεία στην ελληνορωμαϊκή αρχαιότητα: Πλησιάζοντας τους θεούς και βλάπτοντας τους ανθρώπους|Graf, Fritz|2004|Πανεπιστημιακές Εκδόσεις Κρήτης
Βιβλία που Θέλω|Συνοπτική Ιστορία της Αρχαίας Ελλάδας: Από την Προϊστορία στους Ελληνιστικούς Χρόνους|Martin, Thomas R.|1996|Yale University Press
Βιβλία που Θέλω|Μετά τον Πόλεμο: Η Ανασυγκρότηση της Οικογένειας, του Έθνους και του Κράτους στην Ελλάδα, 1943–1960|Mazower, Mark|2003|Αλεξάνδρεια
Βιβλία που Θέλω|Περί Αντισημιτισμού: Μια Λέξη στην Ιστορία|Mazower, Mark|2025|Αλεξάνδρεια
Βιβλία που Θέλω|Η Βυζαντινή Κοινοπολιτεία|Obolensky, Dimitri|2022|Μορφωτικό Ίδρυμα Εθνικής Τραπέζης
Βιβλία που Θέλω|Η Πτώση των Οθωμανών: Ο Μεγάλος Πόλεμος στη Μέση Ανατολή, 1914–1920|Rogan, Eugene|2016|Αλεξάνδρεια
Βιβλία που Θέλω|Οι Άραβες: Μια Ιστορία|Rogan, Eugene|2019|Αλεξάνδρεια
Βιβλία που Θέλω|Η Ήττα της Δύσης|Todd, Emmanuel||Πεδίο
Βιβλία που Θέλω|Η Μεσαιωνική Ευρώπη|Wickham, Chris|2018|Αλεξάνδρεια
Βιβλία που Θέλω|Ιστορία του Λαού των Ηνωμένων Πολιτειών: Μια Κοινωνική Ιστορία της Αμερικής από την Εποχή του Κολόμβου ως τις Αρχές του 21ου Αιώνα|Zinn, Howard|2008|Αιώρα
`.trim();

const entries = CATALOG.split('\n').map((line) => {
  const [subject, title, author, year, publisher] = line.split('|');
  return {
    subject,
    title,
    author,
    publishYear: year ? Number(year) : undefined,
    publisher: publisher || undefined,
  };
});

async function main() {
  const userId = process.argv[2];
  if (!userId)
    throw new Error('Usage: tsx scripts/import-pdf-catalog.ts <user-id>');

  const subjectIds = new Map<string, number>();
  const existing = new Set(
    (await listBooks(userId)).map(
      (book) => `${book.title}\u0000${book.author}`,
    ),
  );
  let created = 0;
  for (const entry of entries) {
    const author = entry.author || 'Unknown';
    const bookKey = `${entry.title}\u0000${author}`;
    if (existing.has(bookKey)) continue;
    const subject =
      subjectIds.get(entry.subject) ??
      (await getOrCreateSubject(userId, entry.subject)).id;
    subjectIds.set(entry.subject, subject);
    const book = await createBook(userId, {
      title: entry.title,
      author,
      format: 'paperback',
      publisher: entry.publisher,
      publishYear: entry.publishYear,
    });
    await assignSubject(userId, book.id, subject);
    existing.add(bookKey);
    created++;
  }
  console.log(
    `Imported ${created} books for ${userId} across ${subjectIds.size} subjects.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(
    'Catalog import failed:',
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
