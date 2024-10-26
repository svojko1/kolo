import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Calendar,
  User2,
  Tags,
  Info,
  ScanLine,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "./components/ui/card";
import { RotateCcw, Type } from "lucide-react";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import { BrowserMultiFormatReader } from "@zxing/library";
import NotFoundState from "./components/NotFoundState";

const bookService = {
  async getBookByISBN(isbn) {
    try {
      // First try Open Library API
      const openLibraryUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
      const response = await fetch(openLibraryUrl);
      const data = await response.json();
      const bookData = data[`ISBN:${isbn}`];

      if (bookData) {
        // Transform Open Library data to match our app's format
        // Handle cases where author might be an object
        const authors = bookData.authors
          ? bookData.authors
              .map((author) =>
                typeof author === "object" ? author.name : author
              )
              .join(", ")
          : "Neznámy";

        // Handle cases where description might be an object
        const description = bookData.description
          ? typeof bookData.description === "object"
            ? bookData.description.value
            : bookData.description
          : null;

        // Handle cases where subjects might be objects
        const genre = bookData.subjects
          ? typeof bookData.subjects[0] === "object"
            ? bookData.subjects[0].name
            : bookData.subjects[0]
          : "Neznámy";

        return {
          isbn: isbn,
          title: bookData.title || "Neznámy názov",
          author: authors,
          publicationYear: bookData.publish_date
            ? parseInt(bookData.publish_date.match(/\d{4}/)?.[0])
            : null,
          genre: genre,
          publisher: bookData.publishers?.[0] || "Neznámy",
          description: description,
        };
      }

      // If Open Library fails, try Google Books API as fallback
      const googleResponse = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );
      const googleData = await googleResponse.json();

      if (googleData.items && googleData.items.length > 0) {
        const book = googleData.items[0].volumeInfo;
        return {
          isbn: isbn,
          title: book.title || "Neznámy názov",
          author: book.authors ? book.authors.join(", ") : "Neznámy",
          publicationYear: book.publishedDate
            ? parseInt(book.publishedDate.substring(0, 4))
            : null,
          genre: book.categories ? book.categories[0] : "Neznámy",
          publisher: book.publisher || "Neznámy",
          description: book.description || null,
        };
      }

      return null;
    } catch (error) {
      console.error("Chyba pri načítaní knihy:", error);
      throw new Error("Nepodarilo sa načítať údaje o knihe");
    }
  },
};

const evaluateBook = (book, rules) => {
  const decisions = [];
  let shouldKeep = true;

  const bookAge = new Date().getFullYear() - book.publicationYear;
  if (bookAge > rules.maxAge) {
    decisions.push(
      `Kniha je stará ${bookAge} rokov (staršia ako ${rules.maxAge} rokov)`
    );
    shouldKeep = false;
  }

  if (rules.recycleGenres.includes(book.genre)) {
    decisions.push(`Žáner "${book.genre}" je v zozname na recykláciu`);
    shouldKeep = false;
  }

  return {
    shouldKeep,
    decisions,
  };
};

const BookDetails = ({ book, evaluation, onNext }) => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  if (!book) return null;

  const statusStyles = evaluation.shouldKeep
    ? {
        card: "bg-green-50 border-green-200",
        header: "bg-green-100/50",
        badge:
          "bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200",
        title: "text-green-900",
        label: "text-green-600",
        value: "text-green-900",
        list: "text-green-800",
        icon: "text-green-600",
        button: "bg-green-600 hover:bg-green-700 text-white",
      }
    : {
        card: "bg-red-50 border-red-200",
        header: "bg-red-100/50",
        badge: "bg-red-100 text-red-800 hover:bg-red-100/80 border-red-200",
        title: "text-red-900",
        label: "text-red-600",
        value: "text-red-900",
        list: "text-red-800",
        icon: "text-red-600",
        button: "bg-red-600 hover:bg-red-700 text-white",
      };

  const displayTitle = String(book.title || "Neznámy názov");
  const displayAuthor = String(book.author || "Neznámy");
  const displayYear = book.publicationYear
    ? String(book.publicationYear)
    : "Neznámy";
  const displayGenre = String(book.genre || "Neznámy");
  const displayDescription = book.description ? String(book.description) : null;

  return (
    <Card
      className={`mt-4 ${statusStyles.card} transition-colors duration-200`}
    >
      <CardHeader className={`${statusStyles.header} pb-3`}>
        <div className="flex items-center justify-between mb-2">
          <Badge
            variant="outline"
            className={`${statusStyles.badge} text-base px-4 py-1`}
          >
            {evaluation.shouldKeep ? "Ponechať" : "Recyklovať"}
          </Badge>
          <span className={`text-xs ${statusStyles.value} opacity-70`}>
            ISBN: {book.isbn}
          </span>
        </div>
        <h2
          className={`text-xl font-semibold ${statusStyles.title} line-clamp-2`}
        >
          {displayTitle}
        </h2>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center space-x-3">
              <User2 className={`h-4 w-4 ${statusStyles.icon}`} />
              <div>
                <p className={`text-xs ${statusStyles.label}`}>Autor</p>
                <p className={`text-sm font-medium ${statusStyles.value}`}>
                  {displayAuthor}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className={`h-4 w-4 ${statusStyles.icon}`} />
              <div>
                <p className={`text-xs ${statusStyles.label}`}>Rok vydania</p>
                <p className={`text-sm font-medium ${statusStyles.value}`}>
                  {displayYear}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Tags className={`h-4 w-4 ${statusStyles.icon}`} />
              <div>
                <p className={`text-xs ${statusStyles.label}`}>Žáner</p>
                <p className={`text-sm font-medium ${statusStyles.value}`}>
                  {displayGenre}
                </p>
              </div>
            </div>

            {displayDescription && (
              <div className="flex items-start space-x-3 pt-1">
                <Info className={`h-4 w-4 ${statusStyles.icon} mt-0.5`} />
                <div className="flex-1">
                  <p className={`text-xs ${statusStyles.label}`}>Popis</p>
                  <p
                    className={`text-sm ${statusStyles.value} ${
                      !isDescriptionExpanded ? "line-clamp-3" : ""
                    }`}
                  >
                    {displayDescription}
                  </p>
                  {displayDescription.length > 150 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-8 px-2 text-xs"
                      onClick={() =>
                        setIsDescriptionExpanded(!isDescriptionExpanded)
                      }
                    >
                      {isDescriptionExpanded
                        ? "Zobraziť menej"
                        : "Zobraziť viac"}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <Collapsible open={isDebugOpen} onOpenChange={setIsDebugOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50/80 rounded-md hover:bg-gray-100">
            Detaily rozhodnutia
            {isDebugOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="pl-3 space-y-1">
              {evaluation.decisions.length > 0 ? (
                evaluation.decisions.map((decision, index) => (
                  <p
                    key={index}
                    className={`text-sm ${statusStyles.list} flex items-center gap-2`}
                  >
                    <span className="w-1 h-1 rounded-full bg-current flex-shrink-0 mt-1" />
                    <span className="text-xs">{decision}</span>
                  </p>
                ))
              ) : (
                <p
                  className={`text-sm ${statusStyles.list} flex items-center gap-2`}
                >
                  <span className="w-1 h-1 rounded-full bg-current flex-shrink-0 mt-1" />
                  <span className="text-xs">Kniha spĺňa všetky kritériá</span>
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      <CardFooter className="pt-2 pb-4">
        <Button className={`w-full ${statusStyles.button}`} onClick={onNext}>
          <ScanLine className="mr-2 h-4 w-4" />
          Skenovať ďalšiu knihu
        </Button>
      </CardFooter>
    </Card>
  );
};

const App = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [manualISBN, setManualISBN] = useState("");
  const [scannedBook, setScannedBook] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [scanDebug, setScanDebug] = useState(null);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const streamRef = useRef(null);

  const rules = {
    maxAge: 30,
    recycleGenres: ["Časopis", "Noviny", "Technológia"],
  };

  const startCamera = async () => {
    try {
      // Make sure previous stream is stopped
      await stopCamera();

      setScanDebug("Inicializácia kamery...");
      const constraints = {
        video: {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
      };

      // Get direct access to stream first
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Set stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const scannedText = result.getText();
            setLastScanned(scannedText);
            setScanDebug(`Detegovaný kód: ${scannedText}`);

            const cleanISBN = scannedText.replace(/[-\s]/g, "");
            if (/^(?:\d{10}|\d{13})$/.test(cleanISBN)) {
              await fetchBook(cleanISBN);
            } else {
              setScanDebug(`Neplatný formát ISBN: ${scannedText}`);
            }
          }
          if (error && error?.message) {
            if (!error.message.includes("not found")) {
              setScanDebug(`Chyba skenovania: ${error.message}`);
            }
          }
        }
      );

      setIsStreaming(true);
      setError(null);
      setScanDebug("Kamera je pripravená. Namierte na čiarový kód ISBN.");
    } catch (err) {
      setError(
        `Chyba pri prístupe ku kamere: ${err.message}. Prosím, skontrolujte povolenia alebo použite manuálne zadanie.`
      );
      setScanDebug(`Chyba kamery: ${err.message}`);
      console.error("Chyba pri prístupe ku kamere:", err);
    }
  };

  const stopCamera = async () => {
    // First stop all tracks of the active stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Then reset the code reader
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      setIsStreaming(false);
    }
  };

  const fetchBook = async (isbn) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setScanDebug(`Vyhľadávanie údajov o knihe pre ISBN: ${isbn}`);

    try {
      const book = await bookService.getBookByISBN(isbn);
      if (book) {
        const evaluation = evaluateBook(book, rules);
        setScannedBook({ ...book, evaluation });
        setScanDebug(`Úspešne nájdená kniha: ${book.title}`);
        stopCamera();
      } else {
        setScannedBook({ notFound: true, isbn });
        setScanDebug(`Nenašli sa údaje o knihe pre ISBN: ${isbn}`);
      }
    } catch (err) {
      setError(`Chyba pri načítaní detailov knihy: ${err.message}`);
      setScanDebug(`Chyba API: ${err.message}`);
      setScannedBook(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualISBN.trim()) {
      fetchBook(manualISBN.trim());
    }
  };

  const resetApp = async () => {
    setScannedBook(null);
    setManualISBN("");
    setError(null);
    await startCamera(); // Wait for camera to start
  };

  // Initialize camera and scanner on component mount
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">Skener kníh</span>
            {(scannedBook || error) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetApp}
                className="hover:bg-gray-100"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            )}
          </CardTitle>
          {!scannedBook && !isLoading && (
            <p className="text-sm text-gray-500">
              Naskenujte ISBN knihy alebo ho zadajte manuálne
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {!scannedBook && !isLoading && (
            <>
              <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70 text-center px-4">
                    Inicializácia kamery...
                  </div>
                )}
                {isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-500 rounded-lg animate-pulse">
                      <div className="w-full h-1 bg-blue-500 animate-scan"></div>
                    </div>
                  </div>
                )}
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full py-6 text-lg">
                    <Type className="mr-2 h-5 w-5" />
                    Zadať ISBN manuálne
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[90%]">
                  <DialogHeader>
                    <DialogTitle>Zadajte ISBN</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <Input
                      placeholder="978-0307474278"
                      value={manualISBN}
                      onChange={(e) => setManualISBN(e.target.value)}
                      className="font-mono text-lg py-6"
                    />
                    <Button type="submit" className="w-full py-6">
                      <BookOpen className="mr-2 h-5 w-5" />
                      Vyhľadať knihu
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {isLoading && !scannedBook && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">
                Vyhľadávanie detailov knihy...
              </p>
            </div>
          )}

          {scannedBook &&
            (scannedBook.notFound ? (
              <NotFoundState isbn={scannedBook.isbn} />
            ) : (
              <BookDetails
                book={scannedBook}
                evaluation={scannedBook.evaluation}
                onNext={resetApp}
              />
            ))}
        </CardContent>
      </Card>

      <style jsx global>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(192px);
          }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
