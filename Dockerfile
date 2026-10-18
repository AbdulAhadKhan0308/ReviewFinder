# Builds one image that serves the React app and the API on port 8080, plus a migrations bundle.
#   docker build -t restaurant-reviews .
#   Run the app:         (default command)
#   Apply migrations:    ./efbundle
#   Reset to demo data:  dotnet RestaurantReviews.Api.dll reset-db
#                        (deletes all data first; refuses to run unless ASPNETCORE_ENVIRONMENT=Development)

FROM node:22-alpine AS client
WORKDIR /src/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS server
WORKDIR /src
COPY dotnet-tools.json ./
RUN dotnet tool restore
COPY server/RestaurantReviews.Api/RestaurantReviews.Api.csproj server/RestaurantReviews.Api/
RUN dotnet restore server/RestaurantReviews.Api
COPY server/ server/
RUN dotnet publish server/RestaurantReviews.Api -c Release --no-restore -o /app
# Building the bundle starts the app to find its DbContext, and the app needs a connection string to start.
# The Development settings provide one; the bundle doesn't connect while it's being built.
RUN ASPNETCORE_ENVIRONMENT=Development dotnet ef migrations bundle \
        --project server/RestaurantReviews.Api -r linux-x64 -o /app/efbundle

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
# The load balancer ends HTTPS; trust its X-Forwarded-For and X-Forwarded-Proto headers.
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
COPY --from=server /app ./
COPY --from=client /src/client/dist ./wwwroot
EXPOSE 8080
# The image includes a non-root "app" user but starts as root unless told otherwise.
USER $APP_UID
# CMD rather than ENTRYPOINT, so a one-off ECS task can run ./efbundle or reset-db instead.
CMD ["dotnet", "RestaurantReviews.Api.dll"]
