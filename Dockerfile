FROM golang:1.23 as builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o booking-system .

FROM alpine:latest
RUN apk --no-cache add ca-certificates postgresql-client

WORKDIR /app
COPY --from=builder /app/booking-system .
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static
COPY --from=builder /app/migrations ./migrations
COPY entrypoint.sh .

RUN chmod +x entrypoint.sh

EXPOSE 8080
CMD ["./entrypoint.sh"]