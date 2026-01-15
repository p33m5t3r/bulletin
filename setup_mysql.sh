#!/bin/sh

DATABASE_URL=mysql://root:dev@localhost:3306/bulletin bunx drizzle-kit push
