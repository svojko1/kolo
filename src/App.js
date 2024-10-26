import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  CircleSlash,
  Scan,
  BookOpen,
  Type,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
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

// Mock data service remains unchanged
const mockBookService = {
  async getBookByISBN(isbn) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const book = data.items[0].volumeInfo;
        return {
          isbn: isbn,
          title: book.title,
          author: book.authors ? book.authors.join(", ") : "Unknown",
          publicationYear: book.publishedDate
            ? parseInt(book.publishedDate.substring(0, 4))
            : null,
          genre: book.categories ? book.categories[0] : "Unknown",
          publisher: book.publisher || "Unknown",
        };
      }

      const mockBooks = {
        9783161484100: {
          isbn: "9783161484100",
          title: "Modern Web Development",
          author: "Jane Smith",
          publicationYear: 2020,
          genre: "Technology",
          publisher: "Tech Press",
        },
        9780307474278: {
          isbn: "978-0-307-47427-8",
          title: "The Road",
          author: "Cormac McCarthy",
          publicationYear: 2006,
          genre: "Fiction",
          publisher: "Vintage",
        },
      };

      const normalizedISBN = isbn.replace(/[-\s]/g, "");
      return mockBooks[normalizedISBN] || null;
    } catch (error) {
      console.error("Error fetching book:", error);
      return null;
    }
  },
};

// Decision service remains unchanged
const evaluateBook = (book, rules) => {
  const decisions = [];
  let shouldKeep = true;

  const bookAge = new Date().getFullYear() - book.publicationYear;
  if (bookAge > rules.maxAge) {
    decisions.push(
      `Book is ${bookAge} years old (older than ${rules.maxAge} years)`
    );
    shouldKeep = false;
  }

  if (rules.recycleGenres.includes(book.genre)) {
    decisions.push(`Genre "${book.genre}" is in recycle list`);
    shouldKeep = false;
  }

  return {
    shouldKeep,
    decisions,
  };
};

// Improved BookDetails component with better status visibility
const BookDetails = ({ book, evaluation }) => {
  const [isDebugOpen, setIsDebugOpen] = useState(false);

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
      }
    : {
        card: "bg-red-50 border-red-200",
        header: "bg-red-100/50",
        badge: "bg-red-100 text-red-800 hover:bg-red-100/80 border-red-200",
        title: "text-red-900",
        label: "text-red-600",
        value: "text-red-900",
        list: "text-red-800",
      };

  return (
    <Card
      className={`mt-4 ${statusStyles.card} transition-colors duration-200`}
    >
      <CardHeader className={`${statusStyles.header}`}>
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`${statusStyles.badge} text-lg px-6 py-2`}
          >
            {evaluation.shouldKeep ? "Keep" : "Recycle"}
          </Badge>
          <span className={`text-sm ${statusStyles.value} opacity-70`}>
            ISBN: {book.isbn}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h2 className={`text-xl font-semibold ${statusStyles.title}`}>
            {book.title}
          </h2>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[140px]">
              <p className={`text-sm ${statusStyles.label}`}>Author</p>
              <p className={`font-medium ${statusStyles.value}`}>
                {book.author}
              </p>
            </div>
            <div>
              <p className={`text-sm ${statusStyles.label}`}>Year</p>
              <p className={`font-medium ${statusStyles.value}`}>
                {book.publicationYear}
              </p>
            </div>
            <div>
              <p className={`text-sm ${statusStyles.label}`}>Genre</p>
              <p className={`font-medium ${statusStyles.value}`}>
                {book.genre}
              </p>
            </div>
          </div>
        </div>

        <Collapsible open={isDebugOpen} onOpenChange={setIsDebugOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100">
            View Decision Details
            {isDebugOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="pl-4 space-y-1">
              {evaluation.decisions.length > 0 ? (
                evaluation.decisions.map((decision, index) => (
                  <p
                    key={index}
                    className={`text-sm ${statusStyles.list} flex items-center gap-2`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {decision}
                  </p>
                ))
              ) : (
                <p
                  className={`text-sm ${statusStyles.list} flex items-center gap-2`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  No issues found - book meets all criteria
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

// Main App component remains unchanged
const App = () => {
  // ... rest of the App component code remains exactly the same ...

  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [manualISBN, setManualISBN] = useState("");
  const [scannedBook, setScannedBook] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [scanDebug, setScanDebug] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const codeReaderRef = useRef(null);

  // Rules configuration
  const rules = {
    maxAge: 10,
    recycleGenres: ["Magazine", "Newspaper", "Technology"],
  };

  // Initialize barcode reader
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  // Camera handling
  const startCamera = async () => {
    try {
      setScanDebug("Initializing camera...");
      const constraints = {
        video: {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
      };

      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const scannedText = result.getText();
            setLastScanned(scannedText);
            setScanDebug(`Detected code: ${scannedText}`);

            const cleanISBN = scannedText.replace(/[-\s]/g, "");
            if (/^(?:\d{10}|\d{13})$/.test(cleanISBN)) {
              setIsScanning(false);
              await fetchBook(cleanISBN);
            } else {
              setScanDebug(`Invalid ISBN format: ${scannedText}`);
            }
          }
          if (error && error?.message) {
            if (!error.message.includes("not found")) {
              setScanDebug(`Scan error: ${error.message}`);
            }
          }
        },
        constraints
      );

      setIsStreaming(true);
      setError(null);
      setScanDebug("Camera ready. Point at an ISBN barcode.");
    } catch (err) {
      setError(
        `Error accessing camera: ${err.message}. Please check permissions or use manual input.`
      );
      setScanDebug(`Camera error: ${err.message}`);
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      setIsStreaming(false);
      setIsScanning(false);
    }
  };

  const fetchBook = async (isbn) => {
    if (isLoading) return; // Prevent multiple fetches

    setIsLoading(true);
    setError(null);
    setScanDebug(`Fetching book data for ISBN: ${isbn}`);

    try {
      const book = await mockBookService.getBookByISBN(isbn);
      if (book) {
        const evaluation = evaluateBook(book, rules);
        setScannedBook({ ...book, evaluation });
        setScanDebug(`Successfully found book: ${book.title}`);
        stopCamera(); // Automatically stop camera after successful scan
      } else {
        setError(`No book found with ISBN: ${isbn}`);
        setScanDebug(`No book data found for ISBN: ${isbn}`);
        setScannedBook(null);
      }
    } catch (err) {
      setError(`Error fetching book details: ${err.message}`);
      setScanDebug(`API error: ${err.message}`);
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

  const resetApp = () => {
    setScannedBook(null);
    setManualISBN("");
    setError(null);
    stopCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">Book Scanner</span>
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
              Scan a book's ISBN or enter it manually
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
                  playsInline // Better mobile handling
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70 text-center px-4">
                    Tap "Start Camera" to begin scanning
                  </div>
                )}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-500 rounded-lg animate-pulse">
                      <div className="w-full h-1 bg-blue-500 animate-scan"></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={isStreaming ? stopCamera : startCamera}
                  className="w-full py-6 text-lg"
                  variant={isStreaming ? "destructive" : "default"}
                >
                  {isStreaming ? (
                    <>
                      <CircleSlash className="mr-2 h-5 w-5" />
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-5 w-5" />
                      Start Camera
                    </>
                  )}
                </Button>

                {isStreaming && (
                  <Button
                    onClick={() => setIsScanning(!isScanning)}
                    className="w-full py-6 text-lg"
                    variant={isScanning ? "outline" : "default"}
                  >
                    <Scan className="mr-2 h-5 w-5" />
                    {isScanning ? "Stop Scanning" : "Start Scanning"}
                  </Button>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full py-6 text-lg">
                      <Type className="mr-2 h-5 w-5" />
                      Enter ISBN Manually
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[90%]">
                    <DialogHeader>
                      <DialogTitle>Enter ISBN</DialogTitle>
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
                        Look Up Book
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

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
                Looking up book details...
              </p>
            </div>
          )}

          {scannedBook && (
            <BookDetails
              book={scannedBook}
              evaluation={scannedBook.evaluation}
            />
          )}
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
