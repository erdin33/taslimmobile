
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "info": {
      "title": "Taslim API",
      "version": "1.0.0",
      "description": "API documentation for Taslim backend"
    },
    "security": [
      {
        "bearerAuth": []
      }
    ],
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        }
      }
    },
    "paths": {
      "/users": {
        "get": {
          "tags": [
            "Users"
          ],
          "summary": "Get users",
          "description": "List user accounts. Admin sees all users; mitra sees only active fellow\nmitras (digunakan sebagai daftar tujuan request / peminjaman).\n",
          "responses": {
            "200": {
              "description": "Users retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "Users"
          ],
          "summary": "Create user",
          "description": "Create a new user account.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "username",
                    "password"
                  ],
                  "properties": {
                    "username": {
                      "type": "string",
                      "example": "mitra1"
                    },
                    "password": {
                      "type": "string",
                      "example": "password123"
                    },
                    "role": {
                      "type": "string",
                      "example": "MITRA"
                    },
                    "name": {
                      "type": "string",
                      "example": "Budi"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "User created successfully"
            },
            "400": {
              "description": "Invalid request or duplicate username"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/users/{id}": {
        "put": {
          "tags": [
            "Users"
          ],
          "summary": "Update user",
          "description": "Update an existing user by ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "username": {
                      "type": "string",
                      "example": "mitra2"
                    },
                    "role": {
                      "type": "string",
                      "example": "MITRA"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "User updated successfully"
            },
            "400": {
              "description": "Invalid request"
            },
            "404": {
              "description": "User not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "delete": {
          "tags": [
            "Users"
          ],
          "summary": "Delete user",
          "description": "Delete an existing user by ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "User deleted successfully"
            },
            "403": {
              "description": "Forbidden"
            },
            "404": {
              "description": "User not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/upload/image": {
        "post": {
          "tags": [
            "Upload"
          ],
          "summary": "Upload an image to MinIO",
          "description": "Upload an image file (JPEG, PNG, WebP, GIF, SVG) to MinIO object storage and return its public URL.",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "required": [
                    "image"
                  ],
                  "properties": {
                    "image": {
                      "type": "string",
                      "format": "binary",
                      "description": "Image file to upload (max 5MB)"
                    },
                    "folder": {
                      "type": "string",
                      "example": "avatars",
                      "description": "Subfolder name inside the bucket (default \"images\")"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Image uploaded successfully",
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "properties": {
                      "message": {
                        "type": "string"
                      },
                      "data": {
                        "type": "object",
                        "properties": {
                          "objectName": {
                            "type": "string",
                            "example": "images/171234567890-a1b2c3d4.png"
                          },
                          "bucket": {
                            "type": "string",
                            "example": "arxiva-images"
                          },
                          "url": {
                            "type": "string",
                            "example": "http://localhost:9000/arxiva-images/images/171234567890-a1b2c3d4.png"
                          },
                          "size": {
                            "type": "integer",
                            "example": 102450
                          },
                          "mimeType": {
                            "type": "string",
                            "example": "image/png"
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            "400": {
              "description": "Invalid file format or missing image file"
            },
            "401": {
              "description": "Unauthorized"
            },
            "500": {
              "description": "Upload process failed"
            }
          }
        }
      },
      "/transactions": {
        "get": {
          "tags": [
            "Transactions"
          ],
          "summary": "Get all transactions",
          "description": "Retrieve a list of transaction history records.",
          "responses": {
            "200": {
              "description": "Transactions retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "Transactions"
          ],
          "summary": "Create transaction",
          "description": "Record a new inventory transaction such as masuk, keluar, rusak, or hilang.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "sn",
                    "nomor",
                    "kategori"
                  ],
                  "properties": {
                    "sn": {
                      "type": "string",
                      "example": "SN-001"
                    },
                    "nomor": {
                      "type": "string",
                      "example": "PA-001"
                    },
                    "kategori": {
                      "type": "string",
                      "example": "Keluar"
                    },
                    "status": {
                      "type": "string",
                      "example": "Selesai"
                    },
                    "merek": {
                      "type": "string",
                      "example": "Samsung"
                    },
                    "asal": {
                      "type": "string",
                      "example": "Gudang A"
                    },
                    "tujuan": {
                      "type": "string",
                      "example": "Mitra B"
                    },
                    "mitra": {
                      "type": "string",
                      "example": "Mitra A"
                    },
                    "keterangan": {
                      "type": "string",
                      "example": "Barang dipindahkan"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Transaction created successfully"
            },
            "400": {
              "description": "Invalid request"
            },
            "404": {
              "description": "Item not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/transactions/{id}": {
        "get": {
          "tags": [
            "Transactions"
          ],
          "summary": "Get transaction by ID",
          "description": "Retrieve a single transaction by its ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Transaction retrieved successfully"
            },
            "404": {
              "description": "Transaction not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "delete": {
          "tags": [
            "Transactions"
          ],
          "summary": "Delete transaction",
          "description": "Delete an existing transaction record.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Transaction deleted successfully"
            },
            "404": {
              "description": "Transaction not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/requests": {
        "get": {
          "tags": [
            "Requests"
          ],
          "summary": "Get all requests",
          "description": "Retrieve a list of request records.",
          "responses": {
            "200": {
              "description": "Requests retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "Requests"
          ],
          "summary": "Create request",
          "description": "Create a new inventory request.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "requesterId",
                    "items"
                  ],
                  "properties": {
                    "requesterId": {
                      "type": "string"
                    },
                    "notes": {
                      "type": "string"
                    },
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "materialCategoryId": {
                            "type": "integer"
                          },
                          "brandId": {
                            "type": "integer"
                          },
                          "quantity": {
                            "type": "integer"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Request created successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/requests/{id}": {
        "get": {
          "tags": [
            "Requests"
          ],
          "summary": "Get request by ID",
          "description": "Retrieve a single request by its ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Request retrieved successfully"
            },
            "404": {
              "description": "Request not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/requests/{id}/status": {
        "put": {
          "tags": [
            "Requests"
          ],
          "summary": "Update request status",
          "description": "Update status for an existing request.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "status"
                  ],
                  "properties": {
                    "status": {
                      "type": "string",
                      "example": "DISETUJUI"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Request status updated successfully"
            },
            "400": {
              "description": "Invalid status"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/requests/{id}/allocate": {
        "post": {
          "tags": [
            "Requests"
          ],
          "summary": "Allocate items to a request",
          "description": "Allocate specific hardware units to a request (Admin only)"
        }
      },
      "/requests/{id}/bast": {
        "get": {
          "tags": [
            "Requests"
          ],
          "summary": "Download BAST document",
          "description": "Securely download BAST document (Admin or Requester)"
        }
      },
      "/requests/{id}/bast-pdf": {
        "get": {
          "tags": [
            "Requests"
          ],
          "summary": "Generate and download BAST PDF document",
          "description": "Securely generate and download BAST document as PDF (Admin or Requester)"
        }
      },
      "/requests/{id}/sign-bast": {
        "post": {
          "tags": [
            "Requests"
          ],
          "summary": "Sign BAST document",
          "description": "Sign the BAST document by adding the current user's profile signature"
        }
      },
      "/recon-progress": {
        "get": {
          "tags": [
            "Recon"
          ],
          "summary": "Get daily recon progress filtered by user/date",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "userId",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "date",
              "schema": {
                "type": "string",
                "example": "YYYY-MM-DD"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "List of recon records"
            }
          }
        },
        "post": {
          "tags": [
            "Recon"
          ],
          "summary": "Submit a single item recon (base64 photo → MinIO URL)",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "itemId": {
                      "type": "string"
                    },
                    "date": {
                      "type": "string",
                      "example": "YYYY-MM-DD"
                    },
                    "image": {
                      "type": "string",
                      "description": "base64 data URL of the photo"
                    },
                    "imageUrl": {
                      "type": "string",
                      "description": "legacy alias for image"
                    },
                    "timestamp": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Recon record saved"
            },
            "403": {
              "description": "Item not owned by user"
            },
            "413": {
              "description": "Photo exceeds 1MB"
            }
          }
        },
        "delete": {
          "tags": [
            "Recon"
          ],
          "summary": "Reset a user's recon progress for a date",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "userId",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "date",
              "schema": {
                "type": "string",
                "example": "YYYY-MM-DD"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Progress reset"
            }
          }
        }
      },
      "/recon-reports": {
        "get": {
          "tags": [
            "Recon"
          ],
          "summary": "Get recon reports filtered by user/date",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "userId",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "date",
              "schema": {
                "type": "string",
                "example": "YYYY-MM-DD"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "List of recon records"
            }
          }
        },
        "post": {
          "tags": [
            "Recon"
          ],
          "summary": "Submit a daily recon report",
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "userId": {
                      "type": "string"
                    },
                    "mitra": {
                      "type": "string"
                    },
                    "tanggal": {
                      "type": "string",
                      "example": "YYYY-MM-DD"
                    },
                    "itemsCount": {
                      "type": "integer"
                    },
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "itemId": {
                            "type": "string"
                          },
                          "imageUrl": {
                            "type": "string"
                          },
                          "timestamp": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Report saved"
            }
          }
        }
      },
      "/material-models": {
        "get": {
          "tags": [
            "MaterialModels"
          ],
          "summary": "Get all material models",
          "description": "Retrieve a list of all material models.",
          "responses": {
            "200": {
              "description": "Material models retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "MaterialModels"
          ],
          "summary": "Create material model",
          "description": "Create a new material model.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "nama",
                    "materialCategoryId",
                    "brandId"
                  ],
                  "properties": {
                    "nama": {
                      "type": "string",
                      "example": "HG8245H"
                    },
                    "materialCategoryId": {
                      "type": "integer",
                      "example": 1
                    },
                    "brandId": {
                      "type": "integer",
                      "example": 1
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Material model created successfully"
            },
            "400": {
              "description": "Invalid request or duplicate name"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/material-models/{id}": {
        "get": {
          "tags": [
            "MaterialModels"
          ],
          "summary": "Get material model by ID",
          "description": "Retrieve a single material model using its ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Material model retrieved successfully"
            },
            "404": {
              "description": "Material model not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "put": {
          "tags": [
            "MaterialModels"
          ],
          "summary": "Update material model",
          "description": "Update details of an existing material model.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "nama": {
                      "type": "string",
                      "example": "EG8145V5"
                    },
                    "materialCategoryId": {
                      "type": "integer",
                      "example": 2
                    },
                    "brandId": {
                      "type": "integer",
                      "example": 2
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Material model updated successfully"
            },
            "404": {
              "description": "Material model not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "delete": {
          "tags": [
            "MaterialModels"
          ],
          "summary": "Delete material model",
          "description": "Delete a material model by ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Material model deleted successfully"
            },
            "404": {
              "description": "Material model not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/locations": {
        "get": {
          "tags": [
            "Locations"
          ],
          "summary": "Get all locations",
          "description": "Retrieve all storage locations and their levels.",
          "responses": {
            "200": {
              "description": "Locations retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "Locations"
          ],
          "summary": "Create location",
          "description": "Create a new storage location or rack.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "name",
                    "type"
                  ],
                  "properties": {
                    "name": {
                      "type": "string",
                      "example": "Gudang A"
                    },
                    "type": {
                      "type": "string",
                      "example": "Kardus"
                    },
                    "capacity": {
                      "type": "integer",
                      "example": 50
                    },
                    "brandRule": {
                      "type": "string",
                      "example": "Samsung"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Location created successfully"
            },
            "400": {
              "description": "Invalid request"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/locations/{id}": {
        "put": {
          "tags": [
            "Locations"
          ],
          "summary": "Update location",
          "description": "Update an existing storage location.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string",
                      "example": "Gudang B"
                    },
                    "capacity": {
                      "type": "integer",
                      "example": 80
                    },
                    "brandRule": {
                      "type": "string",
                      "example": "Apple"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Location updated successfully"
            },
            "404": {
              "description": "Location not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "delete": {
          "tags": [
            "Locations"
          ],
          "summary": "Delete location",
          "description": "Delete an existing storage location.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Location deleted successfully"
            },
            "404": {
              "description": "Location not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/locations/{id}/toggle": {
        "patch": {
          "tags": [
            "Locations"
          ],
          "summary": "Toggle location status",
          "description": "Activate or deactivate a storage location.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "isActive"
                  ],
                  "properties": {
                    "isActive": {
                      "type": "boolean",
                      "example": true
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Location status updated successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/locations/{id}/migrate-items": {
        "post": {
          "tags": [
            "Locations"
          ],
          "summary": "Migrate all items to another location (admin only)",
          "description": "Move every item from the source location into the target location within one transaction. Rejected entirely when target capacity is insufficient.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              },
              "description": "Source location id"
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "targetLocationId"
                  ],
                  "properties": {
                    "targetLocationId": {
                      "type": "integer",
                      "example": 12
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Items migrated successfully"
            },
            "400": {
              "description": "Invalid migration (same location, empty source, inactive target, etc.)"
            },
            "409": {
              "description": "Target capacity insufficient"
            }
          }
        }
      },
      "/items": {
        "get": {
          "tags": [
            "Items"
          ],
          "summary": "Get items with pagination, search, and RBAC",
          "description": "Retrieve items filtered by query parameters and authenticated user role."
        },
        "post": {
          "tags": [
            "Items"
          ],
          "summary": "Create item"
        }
      },
      "/items/{id}/history": {
        "get": {
          "tags": [
            "Items"
          ],
          "summary": "Get transaction history for a specific item"
        }
      },
      "/items/{id}": {
        "get": {
          "tags": [
            "Items"
          ],
          "summary": "Get item by ID"
        },
        "put": {
          "tags": [
            "Items"
          ],
          "summary": "Update item"
        },
        "delete": {
          "tags": [
            "Items"
          ],
          "summary": "Delete item"
        }
      },
      "/dashboard/stats/mitra-performance": {
        "get": {
          "tags": [
            "Dashboard"
          ],
          "summary": "Get mitra performance and BAST depletion metrics",
          "description": "Retrieve aggregated metrics for partner BAST depletion lifespan",
          "responses": {
            "200": {
              "description": "Metrics retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/categories": {
        "get": {
          "tags": [
            "Categories"
          ],
          "summary": "Get all categories",
          "description": "Retrieve a list of all item categories.",
          "responses": {
            "200": {
              "description": "Categories retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "Categories"
          ],
          "summary": "Create category",
          "description": "Create a new item category.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "nama",
                    "deskripsi"
                  ],
                  "properties": {
                    "nama": {
                      "type": "string",
                      "example": "Elektronik"
                    },
                    "deskripsi": {
                      "type": "string",
                      "example": "Perangkat elektronik"
                    },
                    "safetyStock": {
                      "type": "integer",
                      "example": 10
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Category created successfully"
            },
            "400": {
              "description": "Missing required fields"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/categories/{id}": {
        "get": {
          "tags": [
            "Categories"
          ],
          "summary": "Get category by ID",
          "description": "Retrieve a single category using its ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Category retrieved successfully"
            },
            "404": {
              "description": "Category not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "put": {
          "tags": [
            "Categories"
          ],
          "summary": "Update category",
          "description": "Update an existing category by ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "nama": {
                      "type": "string",
                      "example": "Elektronik Update"
                    },
                    "deskripsi": {
                      "type": "string",
                      "example": "Update deskripsi"
                    },
                    "safetyStock": {
                      "type": "integer",
                      "example": 15
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Category updated successfully"
            },
            "404": {
              "description": "Category not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "delete": {
          "tags": [
            "Categories"
          ],
          "summary": "Delete category",
          "description": "Delete a category by ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Category deleted successfully"
            },
            "404": {
              "description": "Category not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/brands": {
        "get": {
          "tags": [
            "Brands"
          ],
          "summary": "Get all brands",
          "description": "Retrieve a list of all brands, including their category info.",
          "responses": {
            "200": {
              "description": "Brands retrieved successfully"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "post": {
          "tags": [
            "Brands"
          ],
          "summary": "Create brand",
          "description": "Create a new brand.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "nama",
                    "origin",
                    "identifier"
                  ],
                  "properties": {
                    "nama": {
                      "type": "string",
                      "example": "Samsung"
                    },
                    "origin": {
                      "type": "string",
                      "example": "Korea"
                    },
                    "identifier": {
                      "type": "string",
                      "example": "SAMS"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Brand created successfully"
            },
            "400": {
              "description": "Invalid request or duplicate brand"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/brands/{id}": {
        "get": {
          "tags": [
            "Brands"
          ],
          "summary": "Get brand by ID",
          "description": "Retrieve a single brand using its ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Brand retrieved successfully"
            },
            "404": {
              "description": "Brand not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "put": {
          "tags": [
            "Brands"
          ],
          "summary": "Update brand",
          "description": "Update details of an existing brand.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "nama": {
                      "type": "string",
                      "example": "Samsung Update"
                    },
                    "origin": {
                      "type": "string",
                      "example": "Korea Selatan"
                    },
                    "identifier": {
                      "type": "string",
                      "example": "SAMS2"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Brand updated successfully"
            },
            "404": {
              "description": "Brand not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        },
        "delete": {
          "tags": [
            "Brands"
          ],
          "summary": "Delete brand",
          "description": "Delete a brand by ID.",
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Brand deleted successfully"
            },
            "404": {
              "description": "Brand not found"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/auth/login": {
        "post": {
          "tags": [
            "Auth"
          ],
          "summary": "Login user",
          "description": "Authenticate a user with username and password and return a JWT token.",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "username",
                    "password"
                  ],
                  "properties": {
                    "username": {
                      "type": "string",
                      "example": "admin"
                    },
                    "password": {
                      "type": "string",
                      "example": "password123"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Login successful"
            },
            "400": {
              "description": "Missing credentials"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/auth/me": {
        "get": {
          "tags": [
            "Auth"
          ],
          "summary": "Get current user",
          "description": "Return the authenticated user's profile information.",
          "responses": {
            "200": {
              "description": "Authenticated user retrieved successfully"
            },
            "401": {
              "description": "Unauthorized"
            },
            "500": {
              "description": "Internal server error"
            }
          }
        }
      },
      "/auth/google": {
        "get": {
          "tags": [
            "Auth"
          ],
          "summary": "Get Google OAuth URL (admin only)",
          "responses": {
            "200": {
              "description": "Auth URL generated"
            },
            "403": {
              "description": "Forbidden"
            }
          }
        }
      },
      "/auth/google/exchange": {
        "post": {
          "tags": [
            "Auth"
          ],
          "summary": "Exchange Google OAuth code (admin only)",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "code"
                  ],
                  "properties": {
                    "code": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Connected"
            }
          }
        }
      },
      "/auth/google/status": {
        "get": {
          "tags": [
            "Auth"
          ],
          "summary": "Get system-wide Google connection status",
          "responses": {
            "200": {
              "description": "Status returned"
            }
          }
        }
      },
      "/auth/google/disconnect": {
        "delete": {
          "tags": [
            "Auth"
          ],
          "summary": "Disconnect the system Google account (admin only)",
          "responses": {
            "200": {
              "description": "Disconnected"
            }
          }
        }
      }
    },
    "tags": []
  },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
