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

// Mock data service
const mockBookService = {
  async getBookByISBN(isbn) {
    try {
      // First try to fetch from Google Books API
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

      // Fallback to mock database if no results found
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

// Decision service (unchanged)
const evaluateBook = (book, rules) => {
  const decisions = [];
  let shouldKeep = true;

  // Check publication year
  const bookAge = new Date().getFullYear() - book.publicationYear;
  if (bookAge > rules.maxAge) {
    decisions.push(
      `Book is ${bookAge} years old (older than ${rules.maxAge} years)`
    );
    shouldKeep = false;
  }

  // Check genre
  if (rules.recycleGenres.includes(book.genre)) {
    decisions.push(`Genre "${book.genre}" is in recycle list`);
    shouldKeep = false;
  }

  return {
    shouldKeep,
    decisions,
  };
};

// Book details component (unchanged)
const BookDetails = ({ book, evaluation }) => {
  if (!book) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{book.title}</span>
          <Badge variant={evaluation.shouldKeep ? "success" : "destructive"}>
            {evaluation.shouldKeep ? "Keep" : "Recycle"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Author</p>
            <p className="font-medium">{book.author}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Year</p>
            <p className="font-medium">{book.publicationYear}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Genre</p>
            <p className="font-medium">{book.genre}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ISBN</p>
            <p className="font-medium">{book.isbn}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Decision Reasoning:</p>
          <ul className="list-disc pl-4 space-y-1">
            {evaluation.decisions.length > 0 ? (
              evaluation.decisions.map((decision, index) => (
                <li key={index} className="text-sm">
                  {decision}
                </li>
              ))
            ) : (
              <li className="text-sm">
                No issues found - book meets all criteria
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// Main App
const App = () => {
  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [manualISBN, setManualISBN] = useState("");
  const [scannedBook, setScannedBook] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result) => {
          if (result && isScanning) {
            const isbn = result.getText();
            // Validate ISBN format (basic check)
            if (/^[0-9-]{10,17}$/.test(isbn)) {
              setIsScanning(false);
              await fetchBook(isbn);
            }
          }
        }
      );
      setIsStreaming(true);
      setError(null);
    } catch (err) {
      setError(
        "Error accessing camera. Please check permissions or use manual input."
      );
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

  // Book fetching
  const fetchBook = async (isbn) => {
    setIsLoading(true);
    setError(null);
    try {
      const book = await mockBookService.getBookByISBN(isbn);
      if (book) {
        const evaluation = evaluateBook(book, rules);
        setScannedBook({ ...book, evaluation });
      } else {
        setError(`No book found with ISBN: ${isbn}`);
        setScannedBook(null);
      }
    } catch (err) {
      setError("Error fetching book details");
      setScannedBook(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual ISBN submission
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualISBN.trim()) {
      fetchBook(manualISBN.trim());
    }
  };

  // Reset app state
  const resetApp = () => {
    setScannedBook(null);
    setManualISBN("");
    setError(null);
    stopCamera();
  };

  // Cleanup effect
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
                <canvas ref={canvasRef} className="hidden" />
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

              <div className="flex gap-2">
                <Button
                  onClick={isStreaming ? stopCamera : startCamera}
                  className="flex-1"
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
                    onClick={() => setIsScanning(true)}
                    className="flex-1"
                    disabled={isScanning}
                  >
                    <Scan className="mr-2 h-5 w-5" />
                    {isScanning ? "Scanning..." : "Scan ISBN"}
                  </Button>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
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
                        placeholder="Enter ISBN..."
                        value={manualISBN}
                        onChange={(e) => setManualISBN(e.target.value)}
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
