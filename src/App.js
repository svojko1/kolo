import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  CircleSlash,
  Scan,
  BookOpen,
  Type,
  RotateCcw,
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
          isbn: "978-3-16-148410-0",
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
        <CardTitle className="flex items-center justify-between">
          <span className={statusStyles.title}>{book.title}</span>
          <Badge
            variant="outline"
            className={`${statusStyles.badge} text-sm px-4 py-1`}
          >
            {evaluation.shouldKeep ? "Keep" : "Recycle"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={`text-sm ${statusStyles.label}`}>Author</p>
            <p className={`font-medium ${statusStyles.value}`}>{book.author}</p>
          </div>
          <div>
            <p className={`text-sm ${statusStyles.label}`}>Year</p>
            <p className={`font-medium ${statusStyles.value}`}>
              {book.publicationYear}
            </p>
          </div>
          <div>
            <p className={`text-sm ${statusStyles.label}`}>Genre</p>
            <p className={`font-medium ${statusStyles.value}`}>{book.genre}</p>
          </div>
          <div>
            <p className={`text-sm ${statusStyles.label}`}>ISBN</p>
            <p className={`font-medium ${statusStyles.value}`}>{book.isbn}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className={`text-sm ${statusStyles.label} mb-2`}>
            Decision Reasoning:
          </p>
          <ul className="list-disc pl-4 space-y-1">
            {evaluation.decisions.length > 0 ? (
              evaluation.decisions.map((decision, index) => (
                <li key={index} className={`text-sm ${statusStyles.list}`}>
                  {decision}
                </li>
              ))
            ) : (
              <li className={`text-sm ${statusStyles.list}`}>
                No issues found - book meets all criteria
              </li>
            )}
          </ul>
        </div>
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
    setIsLoading(true);
    setError(null);
    setScanDebug(`Fetching book data for ISBN: ${isbn}`);

    try {
      const book = await mockBookService.getBookByISBN(isbn);
      if (book) {
        const evaluation = evaluateBook(book, rules);
        setScannedBook({ ...book, evaluation });
        setScanDebug(`Successfully found book: ${book.title}`);
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
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Book Evaluation Scanner</span>
            {(scannedBook || error) && (
              <Button variant="ghost" size="icon" onClick={resetApp}>
                <RotateCcw className="h-5 w-5" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scannedBook && (
            <>
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70">
                    Start camera or use manual input
                  </div>
                )}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-blue-500 rounded-lg animate-pulse">
                      <div className="w-full h-1 bg-blue-500 animate-scan"></div>
                    </div>
                  </div>
                )}
              </div>

              {isStreaming && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Scanner Debug Info
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>Status: {scanDebug}</p>
                    {lastScanned && (
                      <p>
                        Last scanned code:{" "}
                        <span className="font-mono">{lastScanned}</span>
                      </p>
                    )}
                    <p>Scanner active: {isScanning ? "Yes" : "No"}</p>
                    <p>Camera stream: {isStreaming ? "Active" : "Inactive"}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={isStreaming ? stopCamera : startCamera}
                  className="flex-1"
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
                    className="flex-1"
                    variant={isScanning ? "outline" : "default"}
                  >
                    <Scan className="mr-2 h-5 w-5" />
                    {isScanning ? "Stop Scanning" : "Start Scanning"}
                  </Button>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Type className="mr-2 h-5 w-5" />
                      Manual Input
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enter ISBN Manually</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                      <Input
                        placeholder="Enter ISBN... (e.g., 978-0307474278)"
                        value={manualISBN}
                        onChange={(e) => setManualISBN(e.target.value)}
                        className="font-mono"
                      />
                      <Button type="submit" className="w-full">
                        <BookOpen className="mr-2 h-5 w-5" />
                        Look Up Book
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">
                Loading book details...
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
            transform: translateY(256px);
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
