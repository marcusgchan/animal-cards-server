class ApiError {
  constructor(code, msg) {
    this.code = code;
    this.msg = msg;
  }

  static badRequest(msg) {
    return new ApiError(400, msg);
  }

  static internal(msg) {
    return new ApiError(500, msg);
  }

  static notFound(msg) {
    return new ApiError(404, msg);
  }
}

module.exports = ApiError;
